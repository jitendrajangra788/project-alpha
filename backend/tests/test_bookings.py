from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import Category, Listing


@pytest.mark.asyncio
async def test_booking_flow_and_double_book_prevention(client: AsyncClient, db_session: AsyncSession):
    cat = Category(code="doctors", name="Doctors", sort_order=1)
    db_session.add(cat)
    await db_session.flush()
    listing = Listing(
        listing_type="DOCTOR",
        category_id=cat.id,
        name="Bookable Demo Doctor",
        slug="bookable-demo-doctor",
        city="Lucknow",
        pin_code="226001",
        address_line="Demo Street",
        consultation_fee=300,
        is_published=True,
        online_consultation_available=True,
    )
    db_session.add(listing)
    await db_session.commit()

    patient = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "Booking Patient",
            "mobile": "9555555555",
            "password": "Patient@123",
            "email": "booking.patient@example.com",
        },
    )
    assert patient.status_code == 200, patient.text
    token = patient.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    day = (date.today() + timedelta(days=1)).isoformat()
    availability = await client.get(
        f"/api/v1/bookings/availability/{listing.id}",
        params={"date": day},
    )
    assert availability.status_code == 200, availability.text
    slots = availability.json()["slots"]
    assert len(slots) > 0
    slot = next(s for s in slots if s["remaining"] > 0)

    create = await client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "listing_id": listing.id,
            "slot_id": slot["id"],
            "scheduled_date": day,
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
            "patient_notes": "Mild fever",
        },
    )
    assert create.status_code == 200, create.text
    booking = create.json()
    assert booking["status"] == "PENDING"
    assert booking["booking_number"]

    # Double booking same slot should fail
    again = await client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "listing_id": listing.id,
            "slot_id": slot["id"],
            "scheduled_date": day,
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
        },
    )
    assert again.status_code == 409

    mine = await client.get("/api/v1/bookings/me", headers=headers)
    assert mine.status_code == 200
    assert len(mine.json()) >= 1

    cancel = await client.post(f"/api/v1/bookings/{booking['id']}/cancel", headers=headers)
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "CANCELLED"
