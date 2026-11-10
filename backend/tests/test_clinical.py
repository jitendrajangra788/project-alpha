import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RoleCode
from app.core.security import hash_password
from app.models.doctor import Doctor
from app.models.organization import Organization, OrganizationMember, OrganizationVerification
from app.models.patient import Patient
from app.models.user import Role, User, UserRole


async def _role(db: AsyncSession, code: str) -> Role:
    return (await db.execute(select(Role).where(Role.code == code))).scalar_one()


@pytest.mark.asyncio
async def test_consent_prescription_and_lab_report_publish(client: AsyncClient, db_session: AsyncSession):

    # Patient via API
    patient_res = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "Clinical Patient",
            "mobile": "9777777777",
            "password": "Patient@123",
            "email": "clinical.patient@example.com",
        },
    )
    assert patient_res.status_code == 200
    patient_token = patient_res.json()["tokens"]["access_token"]
    patient_user_id = patient_res.json()["user"]["id"]
    patient = (await db_session.execute(select(Patient).where(Patient.user_id == patient_user_id))).scalar_one()

    # Doctor user
    doctor_user = User(
        full_name="Clinical Doctor",
        email="clinical.doctor@example.com",
        mobile="9888888888",
        password_hash=hash_password("Doctor@123"),
    )
    db_session.add(doctor_user)
    await db_session.flush()
    doctor_role = await _role(db_session, RoleCode.DOCTOR.value)
    db_session.add(UserRole(user_id=doctor_user.id, role_id=doctor_role.id))
    doctor = Doctor(user_id=doctor_user.id, specialty="General Medicine", city="Lucknow", pin_code="226001")
    db_session.add(doctor)

    # Lab org + owner
    lab_owner = User(
        full_name="Lab Owner",
        email="lab.owner@example.com",
        mobile="9991112233",
        password_hash=hash_password("LabOwner@123"),
    )
    db_session.add(lab_owner)
    await db_session.flush()
    lab_role = await _role(db_session, RoleCode.LAB_OWNER.value)
    db_session.add(UserRole(user_id=lab_owner.id, role_id=lab_role.id))
    org = Organization(
        name="Clinical Demo Lab",
        organization_type="LAB",
        owner_user_id=lab_owner.id,
        contact_number="9991112233",
        address_line="Lab Street",
        city="Lucknow",
        pin_code="226001",
        verification_status="VERIFIED",
    )
    db_session.add(org)
    await db_session.flush()
    db_session.add(OrganizationMember(organization_id=org.id, user_id=lab_owner.id, membership_role="OWNER"))
    db_session.add(OrganizationVerification(organization_id=org.id, status="VERIFIED"))
    await db_session.commit()

    doctor_login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "clinical.doctor@example.com", "password": "Doctor@123"},
    )
    doctor_token = doctor_login.json()["tokens"]["access_token"]

    # Without consent, prescription should fail
    denied = await client.post(
        "/api/v1/clinical/prescriptions",
        headers={"Authorization": f"Bearer {doctor_token}"},
        json={
            "patient_id": patient.id,
            "diagnosis": "Viral fever",
            "medicines": [{"medicine_name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration": "3 days"}],
        },
    )
    assert denied.status_code == 403

    # Patient grants consent
    consent = await client.post(
        "/api/v1/clinical/consents",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"grantee_doctor_id": doctor.id, "purpose": "consultation_followup"},
    )
    assert consent.status_code == 200, consent.text

    rx = await client.post(
        "/api/v1/clinical/prescriptions",
        headers={"Authorization": f"Bearer {doctor_token}"},
        json={
            "patient_id": patient.id,
            "diagnosis": "Viral fever",
            "instructions": "Hydration",
            "medicines": [{"medicine_name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration": "3 days"}],
        },
    )
    assert rx.status_code == 200, rx.text
    assert rx.json()["is_finalized"] is True

    patient_rx = await client.get(
        "/api/v1/clinical/prescriptions",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert patient_rx.status_code == 200
    assert len(patient_rx.json()) >= 1

    lab_login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "lab.owner@example.com", "password": "LabOwner@123"},
    )
    lab_token = lab_login.json()["tokens"]["access_token"]

    report = await client.post(
        "/api/v1/clinical/lab-reports",
        headers={"Authorization": f"Bearer {lab_token}"},
        json={
            "organization_id": org.id,
            "patient_id": patient.id,
            "title": "CBC",
            "results": [
                {
                    "parameter_name": "Hemoglobin",
                    "value": "13.5",
                    "unit": "g/dL",
                    "reference_range": "12-16",
                    "is_abnormal": False,
                }
            ],
        },
    )
    assert report.status_code == 200, report.text
    report_id = report.json()["id"]
    assert report.json()["status"] == "DRAFT"

    # Patient cannot see draft
    hidden = await client.get(
        f"/api/v1/clinical/lab-reports/{report_id}",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert hidden.status_code == 403

    submit = await client.post(
        f"/api/v1/clinical/lab-reports/{report_id}/submit",
        headers={"Authorization": f"Bearer {lab_token}"},
    )
    assert submit.status_code == 200
    publish = await client.post(
        f"/api/v1/clinical/lab-reports/{report_id}/publish",
        headers={"Authorization": f"Bearer {lab_token}"},
    )
    assert publish.status_code == 200
    assert publish.json()["status"] == "PUBLISHED"

    visible = await client.get(
        "/api/v1/clinical/lab-reports/me",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert visible.status_code == 200
    assert any(r["id"] == report_id for r in visible.json())
