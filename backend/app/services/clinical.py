from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import BookingStatus, ConsentStatus, ReportStatus, RoleCode, TimelineEventType
from app.models.booking import Booking
from app.models.clinical import (
    Consultation,
    LabReport,
    LabReportResult,
    LabTest,
    PatientConsent,
    PatientTimelineEvent,
    PatientVital,
    Prescription,
    PrescriptionMedicine,
)
from app.models.doctor import Doctor
from app.models.organization import OrganizationMember
from app.models.patient import Patient
from app.models.user import User
from app.schemas.clinical import (
    ConsentCreate,
    ConsentOut,
    LabReportCreate,
    LabReportOut,
    LabResultOut,
    LabTestCreate,
    LabTestOut,
    PatientDashboardOut,
    PrescriptionCreate,
    PrescriptionOut,
    TimelineEventOut,
    VitalCreate,
    VitalOut,
)
from app.services.audit import write_audit
from app.services.bookings import get_patient_for_user
from app.services.notifications import notify_user


async def get_doctor_for_user(db: AsyncSession, user: User) -> Doctor:
    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=403, detail="Doctor profile required")
    return doctor


def _roles(user: User) -> set[str]:
    return {ur.role.code for ur in user.roles if ur.role}


async def has_active_consent(
    db: AsyncSession,
    *,
    patient_id: str,
    doctor_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    filters = [
        PatientConsent.patient_id == patient_id,
        PatientConsent.status == ConsentStatus.ACTIVE.value,
    ]
    or_filters = []
    if doctor_id:
        or_filters.append(PatientConsent.grantee_doctor_id == doctor_id)
    if organization_id:
        or_filters.append(PatientConsent.grantee_organization_id == organization_id)
    if user_id:
        or_filters.append(PatientConsent.grantee_user_id == user_id)
    if not or_filters:
        return False
    result = await db.execute(select(PatientConsent).where(*filters, or_(*or_filters)))
    return result.scalars().first() is not None


async def assert_patient_record_access(
    db: AsyncSession,
    actor: User,
    patient_id: str,
    *,
    purpose: str = "medical_records",
) -> None:
    patient = (await db.execute(select(Patient).where(Patient.id == patient_id))).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if patient.user_id == actor.id:
        return
    if _roles(actor).intersection({RoleCode.SUPER_ADMIN.value, RoleCode.ADMIN.value}):
        return

    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == actor.id))).scalar_one_or_none()
    memberships = (
        await db.execute(
            select(OrganizationMember.organization_id).where(
                OrganizationMember.user_id == actor.id, OrganizationMember.is_active.is_(True)
            )
        )
    ).scalars().all()

    linked = None
    status_filter = [
        BookingStatus.CONFIRMED.value,
        BookingStatus.ASSIGNED.value,
        BookingStatus.IN_PROGRESS.value,
        BookingStatus.COMPLETED.value,
    ]
    if doctor:
        linked = (
            await db.execute(
                select(Booking)
                .where(
                    Booking.patient_id == patient_id,
                    Booking.doctor_id == doctor.id,
                    Booking.status.in_(status_filter),
                )
                .limit(1)
            )
        ).scalar_one_or_none()
    elif memberships:
        linked = (
            await db.execute(
                select(Booking)
                .where(
                    Booking.patient_id == patient_id,
                    Booking.organization_id.in_(list(memberships)),
                    Booking.status.in_(status_filter),
                )
                .limit(1)
            )
        ).scalar_one_or_none()

    consented = await has_active_consent(
        db,
        patient_id=patient_id,
        doctor_id=doctor.id if doctor else None,
        organization_id=list(memberships)[0] if memberships else None,
        user_id=actor.id,
    )
    if linked or consented:
        await write_audit(
            db,
            action="medical_record.access",
            resource_type="patient",
            resource_id=patient_id,
            actor_user_id=actor.id,
            details=purpose,
        )
        return
    raise HTTPException(status_code=403, detail="Patient consent or linked booking required")


async def add_timeline(
    db: AsyncSession,
    *,
    patient_id: str,
    event_type: str,
    title: str,
    summary: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> None:
    db.add(
        PatientTimelineEvent(
            patient_id=patient_id,
            event_type=event_type,
            title=title,
            summary=summary,
            reference_type=reference_type,
            reference_id=reference_id,
            event_at=datetime.now(timezone.utc),
        )
    )


async def create_consent(db: AsyncSession, user: User, payload: ConsentCreate) -> ConsentOut:
    patient = await get_patient_for_user(db, user)
    if not payload.grantee_doctor_id and not payload.grantee_organization_id:
        raise HTTPException(status_code=400, detail="Doctor or organization grantee required")
    consent = PatientConsent(
        patient_id=patient.id,
        grantee_doctor_id=payload.grantee_doctor_id,
        grantee_organization_id=payload.grantee_organization_id,
        purpose=payload.purpose,
        scope=payload.scope,
        status=ConsentStatus.ACTIVE.value,
        note=payload.note,
    )
    db.add(consent)
    await db.commit()
    await db.refresh(consent)
    return ConsentOut.model_validate(consent)


async def list_consents(db: AsyncSession, user: User) -> List[ConsentOut]:
    patient = await get_patient_for_user(db, user)
    rows = (
        await db.execute(
            select(PatientConsent).where(PatientConsent.patient_id == patient.id).order_by(PatientConsent.created_at.desc())
        )
    ).scalars().all()
    return [ConsentOut.model_validate(r) for r in rows]


async def revoke_consent(db: AsyncSession, user: User, consent_id: str) -> ConsentOut:
    patient = await get_patient_for_user(db, user)
    consent = (
        await db.execute(
            select(PatientConsent).where(PatientConsent.id == consent_id, PatientConsent.patient_id == patient.id)
        )
    ).scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    consent.status = ConsentStatus.REVOKED.value
    consent.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(consent)
    return ConsentOut.model_validate(consent)


def prescription_to_out(rx: Prescription) -> PrescriptionOut:
    return PrescriptionOut(
        id=rx.id,
        consultation_id=rx.consultation_id,
        patient_id=rx.patient_id,
        doctor_id=rx.doctor_id,
        diagnosis=rx.diagnosis,
        instructions=rx.instructions,
        follow_up_date=rx.follow_up_date,
        version=rx.version,
        is_finalized=rx.is_finalized,
        medicines=[MedicineOut_from(m) for m in rx.medicines],
        created_at=rx.created_at,
    )


def MedicineOut_from(m: PrescriptionMedicine):
    from app.schemas.clinical import MedicineOut

    return MedicineOut.model_validate(m)


async def create_prescription(db: AsyncSession, user: User, payload: PrescriptionCreate) -> PrescriptionOut:
    doctor = await get_doctor_for_user(db, user)
    await assert_patient_record_access(db, user, payload.patient_id, purpose="create_prescription")

    consultation = None
    if payload.booking_id:
        booking = (await db.execute(select(Booking).where(Booking.id == payload.booking_id))).scalar_one_or_none()
        if not booking or booking.patient_id != payload.patient_id:
            raise HTTPException(status_code=400, detail="Invalid booking for patient")
        if booking.doctor_id and booking.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Booking not assigned to this doctor")
        existing = (
            await db.execute(select(Consultation).where(Consultation.booking_id == booking.id))
        ).scalar_one_or_none()
        if existing:
            consultation = existing
        else:
            consultation = Consultation(
                booking_id=booking.id,
                patient_id=payload.patient_id,
                doctor_id=doctor.id,
                chief_complaint=payload.chief_complaint,
                diagnosis=payload.diagnosis,
                notes=payload.notes,
                follow_up_date=payload.follow_up_date,
                is_finalized=True,
            )
            db.add(consultation)
            await db.flush()
            if booking.status != BookingStatus.COMPLETED.value:
                booking.status = BookingStatus.COMPLETED.value
                booking.completed_at = datetime.now(timezone.utc)
    if not consultation:
        consultation = Consultation(
            patient_id=payload.patient_id,
            doctor_id=doctor.id,
            chief_complaint=payload.chief_complaint,
            diagnosis=payload.diagnosis,
            notes=payload.notes,
            follow_up_date=payload.follow_up_date,
            is_finalized=True,
        )
        db.add(consultation)
        await db.flush()

    rx = Prescription(
        consultation_id=consultation.id,
        patient_id=payload.patient_id,
        doctor_id=doctor.id,
        diagnosis=payload.diagnosis,
        instructions=payload.instructions,
        follow_up_date=payload.follow_up_date,
        version=1,
        is_finalized=True,
        finalized_at=datetime.now(timezone.utc),
    )
    db.add(rx)
    await db.flush()
    for med in payload.medicines:
        db.add(
            PrescriptionMedicine(
                prescription_id=rx.id,
                medicine_name=med.medicine_name,
                dosage=med.dosage,
                frequency=med.frequency,
                duration=med.duration,
                instructions=med.instructions,
            )
        )
    await add_timeline(
        db,
        patient_id=payload.patient_id,
        event_type=TimelineEventType.PRESCRIPTION.value,
        title="Prescription issued",
        summary=payload.diagnosis or "Prescription created",
        reference_type="prescription",
        reference_id=rx.id,
    )
    patient = (await db.execute(select(Patient).where(Patient.id == payload.patient_id))).scalar_one()
    await notify_user(
        db,
        user_id=patient.user_id,
        event_type="prescription.created",
        title="New prescription",
        body="A doctor issued a prescription to your CareConnect account.",
        payload={"prescription_id": rx.id},
    )
    await db.commit()
    loaded = (
        await db.execute(
            select(Prescription).options(selectinload(Prescription.medicines)).where(Prescription.id == rx.id)
        )
    ).scalar_one()
    return prescription_to_out(loaded)


async def list_prescriptions_for_patient(db: AsyncSession, actor: User, patient_id: str) -> List[PrescriptionOut]:
    await assert_patient_record_access(db, actor, patient_id, purpose="list_prescriptions")
    rows = (
        await db.execute(
            select(Prescription)
            .options(selectinload(Prescription.medicines))
            .where(Prescription.patient_id == patient_id)
            .order_by(Prescription.created_at.desc())
        )
    ).scalars().unique().all()
    return [prescription_to_out(r) for r in rows]


async def patient_timeline(db: AsyncSession, actor: User, patient_id: str) -> List[TimelineEventOut]:
    await assert_patient_record_access(db, actor, patient_id, purpose="timeline")
    rows = (
        await db.execute(
            select(PatientTimelineEvent)
            .where(PatientTimelineEvent.patient_id == patient_id)
            .order_by(PatientTimelineEvent.event_at.desc())
            .limit(100)
        )
    ).scalars().all()
    return [TimelineEventOut.model_validate(r) for r in rows]


async def record_vitals(db: AsyncSession, user: User, payload: VitalCreate) -> VitalOut:
    await assert_patient_record_access(db, user, payload.patient_id, purpose="record_vitals")
    vital = PatientVital(
        patient_id=payload.patient_id,
        recorded_by=user.id,
        recorded_at=datetime.now(timezone.utc),
        temperature_c=payload.temperature_c,
        pulse_bpm=payload.pulse_bpm,
        spo2=payload.spo2,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        notes=payload.notes,
    )
    db.add(vital)
    await add_timeline(
        db,
        patient_id=payload.patient_id,
        event_type=TimelineEventType.VITALS.value,
        title="Vitals recorded",
        summary=payload.notes or "Patient vitals updated",
        reference_type="vital",
        reference_id=None,
    )
    await db.commit()
    await db.refresh(vital)
    return VitalOut.model_validate(vital)


async def patient_dashboard(db: AsyncSession, user: User) -> PatientDashboardOut:
    patient = await get_patient_for_user(db, user)
    rx_count = len(
        (await db.execute(select(Prescription.id).where(Prescription.patient_id == patient.id))).scalars().all()
    )
    report_count = len(
        (
            await db.execute(
                select(LabReport.id).where(
                    LabReport.patient_id == patient.id, LabReport.status == ReportStatus.PUBLISHED.value
                )
            )
        )
        .scalars()
        .all()
    )
    booking_count = len(
        (await db.execute(select(Booking.id).where(Booking.patient_id == patient.id))).scalars().all()
    )
    consent_count = len(
        (
            await db.execute(
                select(PatientConsent.id).where(
                    PatientConsent.patient_id == patient.id, PatientConsent.status == ConsentStatus.ACTIVE.value
                )
            )
        )
        .scalars()
        .all()
    )
    timeline = await patient_timeline(db, user, patient.id)
    return PatientDashboardOut(
        prescriptions=rx_count,
        lab_reports=report_count,
        bookings=booking_count,
        consents=consent_count,
        timeline=timeline,
    )


async def create_lab_test_for_org(
    db: AsyncSession, user: User, organization_id: str, payload: LabTestCreate
) -> LabTestOut:
    membership = (
        await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not membership and not _roles(user).intersection({RoleCode.SUPER_ADMIN.value, RoleCode.ADMIN.value}):
        raise HTTPException(status_code=403, detail="Not a member of this lab organization")
    test = LabTest(
        organization_id=organization_id,
        name=payload.name,
        code=payload.code,
        category=payload.category,
        sample_type=payload.sample_type,
        price=payload.price,
        turnaround_hours=payload.turnaround_hours,
        fasting_required=payload.fasting_required,
    )
    db.add(test)
    await db.commit()
    await db.refresh(test)
    return LabTestOut.model_validate(test)


async def list_lab_tests(db: AsyncSession, organization_id: str) -> List[LabTestOut]:
    rows = (
        await db.execute(
            select(LabTest).where(LabTest.organization_id == organization_id, LabTest.is_active.is_(True))
        )
    ).scalars().all()
    return [LabTestOut.model_validate(r) for r in rows]


def lab_report_to_out(report: LabReport) -> LabReportOut:
    return LabReportOut(
        id=report.id,
        organization_id=report.organization_id,
        patient_id=report.patient_id,
        booking_id=report.booking_id,
        lab_test_id=report.lab_test_id,
        title=report.title,
        status=report.status,
        notes=report.notes,
        published_at=report.published_at,
        results=[LabResultOut.model_validate(r) for r in report.results],
        created_at=report.created_at,
    )


async def create_lab_report(db: AsyncSession, user: User, payload: LabReportCreate) -> LabReportOut:
    membership = (
        await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == payload.organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not membership and RoleCode.LAB_TECHNICIAN.value not in _roles(user):
        if not _roles(user).intersection({RoleCode.LAB_OWNER.value, RoleCode.SUPER_ADMIN.value, RoleCode.ADMIN.value}):
            raise HTTPException(status_code=403, detail="Lab staff access required")

    report = LabReport(
        organization_id=payload.organization_id,
        patient_id=payload.patient_id,
        booking_id=payload.booking_id,
        lab_test_id=payload.lab_test_id,
        title=payload.title,
        status=ReportStatus.DRAFT.value,
        created_by=user.id,
        notes=payload.notes,
    )
    db.add(report)
    await db.flush()
    for result in payload.results:
        db.add(
            LabReportResult(
                report_id=report.id,
                parameter_name=result.parameter_name,
                value=result.value,
                unit=result.unit,
                reference_range=result.reference_range,
                is_abnormal=result.is_abnormal,
            )
        )
    await db.commit()
    loaded = (
        await db.execute(select(LabReport).options(selectinload(LabReport.results)).where(LabReport.id == report.id))
    ).scalar_one()
    return lab_report_to_out(loaded)


async def submit_lab_report(db: AsyncSession, user: User, report_id: str) -> LabReportOut:
    report = await _load_report(db, report_id)
    await _assert_lab_member(db, user, report.organization_id)
    if report.status not in {ReportStatus.DRAFT.value, ReportStatus.REJECTED.value}:
        raise HTTPException(status_code=400, detail="Only draft/rejected reports can be submitted")
    report.status = ReportStatus.PENDING_APPROVAL.value
    await db.commit()
    return await get_lab_report(db, user, report_id)


async def approve_publish_lab_report(db: AsyncSession, user: User, report_id: str, publish: bool = True) -> LabReportOut:
    report = await _load_report(db, report_id)
    await _assert_lab_member(db, user, report.organization_id)
    if report.status != ReportStatus.PENDING_APPROVAL.value:
        raise HTTPException(status_code=400, detail="Report is not pending approval")
    report.status = ReportStatus.PUBLISHED.value if publish else ReportStatus.APPROVED.value
    report.approved_by = user.id
    if publish:
        report.published_at = datetime.now(timezone.utc)
        await add_timeline(
            db,
            patient_id=report.patient_id,
            event_type=TimelineEventType.LAB_REPORT.value,
            title="Lab report published",
            summary=report.title,
            reference_type="lab_report",
            reference_id=report.id,
        )
        patient = (await db.execute(select(Patient).where(Patient.id == report.patient_id))).scalar_one()
        await notify_user(
            db,
            user_id=patient.user_id,
            event_type="lab_report.published",
            title="Lab report ready",
            body=f"{report.title} is now available in your account.",
            payload={"lab_report_id": report.id},
        )
    await db.commit()
    return await get_lab_report(db, user, report_id)


async def _load_report(db: AsyncSession, report_id: str) -> LabReport:
    report = (
        await db.execute(select(LabReport).options(selectinload(LabReport.results)).where(LabReport.id == report_id))
    ).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


async def _assert_lab_member(db: AsyncSession, user: User, organization_id: str) -> None:
    if _roles(user).intersection({RoleCode.SUPER_ADMIN.value, RoleCode.ADMIN.value}):
        return
    membership = (
        await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active.is_(True),
            )
        )
    ).scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a lab organization member")


async def get_lab_report(db: AsyncSession, user: User, report_id: str) -> LabReportOut:
    report = await _load_report(db, report_id)
    patient = (await db.execute(select(Patient).where(Patient.id == report.patient_id))).scalar_one()
    if patient.user_id == user.id:
        if report.status != ReportStatus.PUBLISHED.value:
            raise HTTPException(status_code=403, detail="Report not published yet")
        return lab_report_to_out(report)
    await _assert_lab_member(db, user, report.organization_id)
    return lab_report_to_out(report)


async def list_patient_lab_reports(db: AsyncSession, user: User) -> List[LabReportOut]:
    patient = await get_patient_for_user(db, user)
    rows = (
        await db.execute(
            select(LabReport)
            .options(selectinload(LabReport.results))
            .where(LabReport.patient_id == patient.id, LabReport.status == ReportStatus.PUBLISHED.value)
            .order_by(LabReport.published_at.desc())
        )
    ).scalars().unique().all()
    return [lab_report_to_out(r) for r in rows]


async def list_lab_reports_for_patient(db: AsyncSession, actor: User, patient_id: str) -> List[LabReportOut]:
    """Consent / linked-booking gated reports for treating doctors during consults."""
    await assert_patient_record_access(db, actor, patient_id, purpose="list_lab_reports")
    rows = (
        await db.execute(
            select(LabReport)
            .options(selectinload(LabReport.results))
            .where(
                LabReport.patient_id == patient_id,
                LabReport.status.in_(
                    [
                        ReportStatus.PUBLISHED.value,
                        ReportStatus.APPROVED.value,
                        ReportStatus.PENDING_APPROVAL.value,
                    ]
                ),
            )
            .order_by(LabReport.created_at.desc())
        )
    ).scalars().unique().all()
    return [lab_report_to_out(r) for r in rows]


async def list_org_lab_reports(db: AsyncSession, user: User, organization_id: str) -> List[LabReportOut]:
    await _assert_lab_member(db, user, organization_id)
    rows = (
        await db.execute(
            select(LabReport)
            .options(selectinload(LabReport.results))
            .where(LabReport.organization_id == organization_id)
            .order_by(LabReport.created_at.desc())
        )
    ).scalars().unique().all()
    return [lab_report_to_out(r) for r in rows]
