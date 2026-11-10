from datetime import date, time, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RoleCode
from app.core.security import hash_password
from app.models.booking import Booking
from app.models.doctor import Doctor
from app.models.marketplace import Category, Listing
from app.models.patient import Patient
from app.models.user import Role, User, UserRole


@pytest.mark.asyncio
async def test_video_session_join_token_and_end(client: AsyncClient, db_session: AsyncSession):
    # Patient
    patient_res = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "Video Patient",
            "mobile": "9111222333",
            "password": "Patient@123",
            "email": "video.patient@example.com",
        },
    )
    assert patient_res.status_code == 200
    patient_token = patient_res.json()["tokens"]["access_token"]
    patient_user_id = patient_res.json()["user"]["id"]
    patient = (await db_session.execute(select(Patient).where(Patient.user_id == patient_user_id))).scalar_one()

    # Doctor
    doctor_user = User(
        full_name="Video Doctor",
        email="video.doctor@example.com",
        mobile="9222333444",
        password_hash=hash_password("Doctor@123"),
    )
    db_session.add(doctor_user)
    await db_session.flush()
    doctor_role = (
        await db_session.execute(select(Role).where(Role.code == RoleCode.DOCTOR.value))
    ).scalar_one()
    db_session.add(UserRole(user_id=doctor_user.id, role_id=doctor_role.id))
    doctor = Doctor(user_id=doctor_user.id, specialty="General Medicine", city="Lucknow", pin_code="226001")
    db_session.add(doctor)

    cat = Category(code="doctors", name="Doctors", sort_order=1)
    db_session.add(cat)
    await db_session.flush()
    listing = Listing(
        listing_type="DOCTOR",
        category_id=cat.id,
        name="Video Demo Doctor",
        slug="video-demo-doctor",
        city="Lucknow",
        pin_code="226001",
        address_line="Demo",
        doctor_id=doctor.id,
        is_published=True,
        online_consultation_available=True,
    )
    db_session.add(listing)
    await db_session.flush()

    day = date.today() + timedelta(days=1)
    booking = Booking(
        booking_number="CCVIDEO0001",
        booking_type="VIDEO_CONSULTATION",
        status="CONFIRMED",
        payment_status="UNPAID",
        patient_id=patient.id,
        patient_user_id=patient.user_id,
        listing_id=listing.id,
        doctor_id=doctor.id,
        scheduled_date=day,
        start_time=time(10, 0),
        end_time=time(10, 30),
        is_online=True,
        service_name="Video consult",
    )
    db_session.add(booking)
    await db_session.commit()

    # Non-participant denied
    stranger = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "Stranger",
            "mobile": "9333444555",
            "password": "Patient@123",
            "email": "stranger.video@example.com",
        },
    )
    stranger_token = stranger.json()["tokens"]["access_token"]
    denied = await client.post(
        "/api/v1/video/sessions",
        headers={"Authorization": f"Bearer {stranger_token}"},
        json={"booking_id": booking.id},
    )
    assert denied.status_code == 403

    created = await client.post(
        "/api/v1/video/sessions",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"booking_id": booking.id},
    )
    assert created.status_code == 200, created.text
    session_id = created.json()["id"]
    assert created.json()["status"] == "SCHEDULED"

    join = await client.post(
        f"/api/v1/video/sessions/{session_id}/join",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert join.status_code == 200, join.text
    body = join.json()
    assert body["access_token"]
    assert body["role"] == "patient"
    assert body["expires_in"] > 0
    assert "stun:" in body["ice_servers"][0]["urls"]

    doctor_login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "video.doctor@example.com", "password": "Doctor@123"},
    )
    doctor_token = doctor_login.json()["tokens"]["access_token"]
    doctor_join = await client.post(
        f"/api/v1/video/sessions/{session_id}/join",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert doctor_join.status_code == 200
    assert doctor_join.json()["role"] == "doctor"

    ended = await client.post(
        f"/api/v1/video/sessions/{session_id}/end",
        headers={"Authorization": f"Bearer {doctor_token}"},
        json={"reason": "completed", "notes": "Patient advised rest", "diagnosis": "Viral fever"},
    )
    assert ended.status_code == 200, ended.text
    assert ended.json()["status"] == "ENDED"
    assert ended.json()["notes"] == "Patient advised rest"
