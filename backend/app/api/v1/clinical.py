from typing import List, Optional

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.clinical import (
    ConsentCreate,
    ConsentOut,
    LabReportCreate,
    LabReportOut,
    LabTestCreate,
    LabTestOut,
    PatientDashboardOut,
    PrescriptionCreate,
    PrescriptionOut,
    TimelineEventOut,
    VitalCreate,
    VitalOut,
)
from app.services import clinical as clinical_service
from app.services.bookings import get_patient_for_user

router = APIRouter()


@router.get("/patient/dashboard", response_model=PatientDashboardOut)
async def patient_dashboard(user: CurrentUser, db: DbSession):
    return await clinical_service.patient_dashboard(db, user)


@router.get("/patient/me/id")
async def my_patient_id(user: CurrentUser, db: DbSession):
    patient = await get_patient_for_user(db, user)
    return {"patient_id": patient.id}


@router.get("/doctor/me/id")
async def my_doctor_id(user: CurrentUser, db: DbSession):
    doctor = await clinical_service.get_doctor_for_user(db, user)
    return {"doctor_id": doctor.id}


@router.post("/consents", response_model=ConsentOut)
async def create_consent(payload: ConsentCreate, user: CurrentUser, db: DbSession):
    return await clinical_service.create_consent(db, user, payload)


@router.get("/consents", response_model=List[ConsentOut])
async def list_consents(user: CurrentUser, db: DbSession):
    return await clinical_service.list_consents(db, user)


@router.post("/consents/{consent_id}/revoke", response_model=ConsentOut)
async def revoke_consent(consent_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.revoke_consent(db, user, consent_id)


@router.post("/prescriptions", response_model=PrescriptionOut)
async def create_prescription(payload: PrescriptionCreate, user: CurrentUser, db: DbSession):
    return await clinical_service.create_prescription(db, user, payload)


@router.get("/prescriptions", response_model=List[PrescriptionOut])
async def list_prescriptions(
    user: CurrentUser,
    db: DbSession,
    patient_id: Optional[str] = Query(None),
):
    if not patient_id:
        patient = await get_patient_for_user(db, user)
        patient_id = patient.id
    return await clinical_service.list_prescriptions_for_patient(db, user, patient_id)


@router.get("/timeline/{patient_id}", response_model=List[TimelineEventOut])
async def timeline(patient_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.patient_timeline(db, user, patient_id)


@router.post("/vitals", response_model=VitalOut)
async def create_vitals(payload: VitalCreate, user: CurrentUser, db: DbSession):
    return await clinical_service.record_vitals(db, user, payload)


@router.post("/labs/{organization_id}/tests", response_model=LabTestOut)
async def create_lab_test(organization_id: str, payload: LabTestCreate, user: CurrentUser, db: DbSession):
    return await clinical_service.create_lab_test_for_org(db, user, organization_id, payload)


@router.get("/labs/{organization_id}/tests", response_model=List[LabTestOut])
async def list_lab_tests(organization_id: str, db: DbSession):
    return await clinical_service.list_lab_tests(db, organization_id)


@router.post("/lab-reports", response_model=LabReportOut)
async def create_lab_report(payload: LabReportCreate, user: CurrentUser, db: DbSession):
    return await clinical_service.create_lab_report(db, user, payload)


@router.post("/lab-reports/{report_id}/submit", response_model=LabReportOut)
async def submit_lab_report(report_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.submit_lab_report(db, user, report_id)


@router.post("/lab-reports/{report_id}/publish", response_model=LabReportOut)
async def publish_lab_report(report_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.approve_publish_lab_report(db, user, report_id, publish=True)


@router.get("/lab-reports/me", response_model=List[LabReportOut])
async def my_lab_reports(user: CurrentUser, db: DbSession):
    return await clinical_service.list_patient_lab_reports(db, user)


@router.get("/lab-reports/patient/{patient_id}", response_model=List[LabReportOut])
async def patient_lab_reports(patient_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.list_lab_reports_for_patient(db, user, patient_id)


@router.get("/lab-reports/org/{organization_id}", response_model=List[LabReportOut])
async def org_lab_reports(organization_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.list_org_lab_reports(db, user, organization_id)


@router.get("/lab-reports/{report_id}", response_model=LabReportOut)
async def get_lab_report(report_id: str, user: CurrentUser, db: DbSession):
    return await clinical_service.get_lab_report(db, user, report_id)
