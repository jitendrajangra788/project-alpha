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
from app.models.organization import Organization, OrganizationMember
from app.models.patient import Patient
from app.models.payment import PlatformCommission, SubscriptionPlan
from app.models.user import Role, User, UserRole
from app.services.payments import ensure_default_plans
from app.services.razorpay_gateway import MockRazorpayGateway


@pytest.mark.asyncio
async def test_booking_payment_commission_and_refund(client: AsyncClient, db_session: AsyncSession):
    await ensure_default_plans(db_session)

    patient_res = await client.post(
        "/api/v1/auth/register/patient",
        json={
            "full_name": "Pay Patient",
            "mobile": "9444555666",
            "password": "Patient@123",
            "email": "pay.patient@example.com",
        },
    )
    assert patient_res.status_code == 200
    patient_token = patient_res.json()["tokens"]["access_token"]
    patient_user_id = patient_res.json()["user"]["id"]
    patient = (await db_session.execute(select(Patient).where(Patient.user_id == patient_user_id))).scalar_one()

    doctor_user = User(
        full_name="Pay Doctor",
        email="pay.doctor@example.com",
        mobile="9555666777",
        password_hash=hash_password("Doctor@123"),
    )
    db_session.add(doctor_user)
    await db_session.flush()
    doctor_role = (await db_session.execute(select(Role).where(Role.code == RoleCode.DOCTOR.value))).scalar_one()
    db_session.add(UserRole(user_id=doctor_user.id, role_id=doctor_role.id))
    doctor = Doctor(user_id=doctor_user.id, specialty="General Medicine", city="Lucknow", pin_code="226001")
    db_session.add(doctor)

    cat = Category(code="doctors-pay", name="Doctors Pay", sort_order=1)
    db_session.add(cat)
    await db_session.flush()
    listing = Listing(
        listing_type="DOCTOR",
        category_id=cat.id,
        name="Pay Demo Doctor",
        slug="pay-demo-doctor",
        city="Lucknow",
        pin_code="226001",
        address_line="Demo",
        doctor_id=doctor.id,
        is_published=True,
        consultation_fee=500,
    )
    db_session.add(listing)
    await db_session.flush()

    booking = Booking(
        booking_number="CCPAY0001",
        booking_type="DOCTOR",
        status="PENDING",
        payment_status="UNPAID",
        patient_id=patient.id,
        patient_user_id=patient.user_id,
        listing_id=listing.id,
        doctor_id=doctor.id,
        scheduled_date=date.today() + timedelta(days=1),
        start_time=time(11, 0),
        end_time=time(11, 30),
        amount=500,
        service_name="Consult",
    )
    db_session.add(booking)
    await db_session.commit()

    order_res = await client.post(
        "/api/v1/payments/orders",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"booking_id": booking.id},
    )
    assert order_res.status_code == 200, order_res.text
    order = order_res.json()
    assert order["mock"] is True
    assert order["payment"]["amount"] == 500
    assert order["payment"]["commission_amount"] == 50
    assert order["payment"]["provider_amount"] == 450
    payment_id = order["payment"]["id"]
    order_id = order["order_id"]

    # Invalid signature rejected
    bad = await client.post(
        "/api/v1/payments/verify",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "payment_id": payment_id,
            "provider_order_id": order_id,
            "provider_payment_id": "pay_bad",
            "provider_signature": "invalid",
        },
    )
    assert bad.status_code == 400

    pay_id = MockRazorpayGateway.mock_payment_id()
    signature = MockRazorpayGateway.mock_signature(order_id, pay_id)
    ok = await client.post(
        "/api/v1/payments/verify",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "payment_id": payment_id,
            "provider_order_id": order_id,
            "provider_payment_id": pay_id,
            "provider_signature": signature,
        },
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["status"] == "PAID"

    await db_session.refresh(booking)
    assert booking.payment_status == "PAID"
    assert booking.status == "CONFIRMED"

    commission = (
        await db_session.execute(select(PlatformCommission).where(PlatformCommission.payment_id == payment_id))
    ).scalar_one()
    assert commission.commission_amount == 50
    assert commission.is_settled is False

    invoice = await client.get(
        f"/api/v1/payments/{payment_id}/invoice",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert invoice.status_code == 200
    assert invoice.json()["amount"] == 500

    # Idempotent re-verify
    again = await client.post(
        "/api/v1/payments/verify",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "payment_id": payment_id,
            "provider_order_id": order_id,
            "provider_payment_id": pay_id,
            "provider_signature": signature,
        },
    )
    assert again.status_code == 200
    assert again.json()["status"] == "PAID"

    # Admin payout
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@example.com", "password": "Admin@12345"},
    )
    admin_token = admin_login.json()["tokens"]["access_token"]
    payout = await client.post(
        "/api/v1/payments/payouts",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"doctor_id": doctor.id, "settle_commission_ids": [commission.id]},
    )
    assert payout.status_code == 200, payout.text
    assert payout.json()["amount"] == 450

    await db_session.refresh(commission)
    assert commission.is_settled is True

    refund = await client.post(
        f"/api/v1/payments/{payment_id}/refund",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"reason": "Test refund"},
    )
    assert refund.status_code == 200, refund.text
    assert refund.json()["status"] == "PROCESSED"


@pytest.mark.asyncio
async def test_subscription_mock_complete(client: AsyncClient, db_session: AsyncSession):
    await ensure_default_plans(db_session)
    plan = (await db_session.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == "GROWTH"))).scalar_one()

    owner = User(
        full_name="Clinic Owner",
        email="clinic.owner.pay@example.com",
        mobile="9666777888",
        password_hash=hash_password("Owner@123"),
    )
    db_session.add(owner)
    await db_session.flush()
    owner_role = (
        await db_session.execute(select(Role).where(Role.code == RoleCode.CLINIC_OWNER.value))
    ).scalar_one()
    db_session.add(UserRole(user_id=owner.id, role_id=owner_role.id))
    org = Organization(
        name="Pay Clinic",
        organization_type="CLINIC",
        owner_user_id=owner.id,
        contact_number="9666777888",
        address_line="A",
        city="Lucknow",
        pin_code="226001",
        verification_status="VERIFIED",
    )
    db_session.add(org)
    await db_session.flush()
    db_session.add(
        OrganizationMember(organization_id=org.id, user_id=owner.id, membership_role="OWNER", is_active=True)
    )
    await db_session.commit()

    login = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "clinic.owner.pay@example.com", "password": "Owner@123"},
    )
    token = login.json()["tokens"]["access_token"]

    order = await client.post(
        "/api/v1/subscriptions/subscribe",
        headers={"Authorization": f"Bearer {token}"},
        json={"organization_id": org.id, "plan_id": plan.id},
    )
    assert order.status_code == 200, order.text
    payment_id = order.json()["payment"]["id"]

    done = await client.post(
        f"/api/v1/payments/{payment_id}/mock-complete",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "PAID"

    subs = await client.get(
        f"/api/v1/subscriptions/organizations/{org.id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert subs.status_code == 200
    assert len(subs.json()) >= 1
    assert subs.json()[0]["status"] == "ACTIVE"
    assert subs.json()[0]["plan_code"] == "GROWTH"

    plans = await client.get("/api/v1/subscriptions/plans")
    assert plans.status_code == 200
    assert len(plans.json()) >= 3
