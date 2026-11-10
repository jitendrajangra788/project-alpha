"""Payment, commission, subscription and payout business logic."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.deps import user_role_codes
from app.core.enums import (
    BookingStatus,
    InvoiceStatus,
    MembershipRole,
    PaymentProvider,
    PaymentPurpose,
    PaymentStatus,
    PayoutStatus,
    RefundStatus,
    RoleCode,
    SubscriptionStatus,
    TransactionType,
)
from app.models.booking import Booking
from app.models.doctor import Doctor
from app.models.marketplace import Listing
from app.models.organization import Organization, OrganizationMember
from app.models.patient import Patient
from app.models.payment import (
    Invoice,
    LedgerTransaction,
    OrganizationSubscription,
    Payment,
    PlatformCommission,
    ProviderPayout,
    Refund,
    SubscriptionPlan,
)
from app.models.user import User
from app.schemas.payment import (
    CommissionOut,
    EarningsSummary,
    InvoiceOut,
    OrganizationSubscriptionOut,
    PaymentCreateOrder,
    PaymentOrderOut,
    PaymentOut,
    PaymentVerify,
    PayoutCreate,
    PayoutOut,
    RefundCreate,
    RefundOut,
    SubscribeRequest,
    SubscriptionPlanCreate,
    SubscriptionPlanOut,
)
from app.services.audit import write_audit
from app.services.notifications import notify_user
from app.services.organizations import get_membership
from app.services.razorpay_gateway import MockRazorpayGateway, get_razorpay_gateway, parse_webhook_event

ADMIN_ROLES = {RoleCode.SUPER_ADMIN.value, RoleCode.ADMIN.value}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _payment_number() -> str:
    return f"CCP{uuid4().hex[:10].upper()}"


def _invoice_number() -> str:
    return f"CCI{uuid4().hex[:10].upper()}"


def _payout_number() -> str:
    return f"CPO{uuid4().hex[:10].upper()}"


def _txn_number() -> str:
    return f"CTX{uuid4().hex[:10].upper()}"


def payment_to_out(payment: Payment) -> PaymentOut:
    return PaymentOut.model_validate(payment)


def _split_amounts(amount: float, commission_percent: float) -> tuple[float, float]:
    commission = round(amount * (commission_percent / 100.0), 2)
    provider_amount = round(amount - commission, 2)
    return commission, provider_amount


async def _get_patient(db: AsyncSession, user: User) -> Patient:
    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile required")
    return patient


async def create_booking_payment_order(
    db: AsyncSession, user: User, payload: PaymentCreateOrder
) -> PaymentOrderOut:
    patient = await _get_patient(db, user)
    booking = (await db.execute(select(Booking).where(Booking.id == payload.booking_id))).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.patient_user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your booking")
    if booking.status in {BookingStatus.CANCELLED.value, BookingStatus.REJECTED.value, BookingStatus.REFUNDED.value}:
        raise HTTPException(status_code=400, detail="Booking is not payable")
    if booking.payment_status == PaymentStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Booking already paid")

    amount = booking.amount
    if amount is None or amount <= 0:
        # Fall back to listing fee
        if booking.listing_id:
            listing = (
                await db.execute(select(Listing).where(Listing.id == booking.listing_id))
            ).scalar_one_or_none()
            amount = listing.consultation_fee if listing else None
        if amount is None or amount <= 0:
            raise HTTPException(status_code=400, detail="Booking has no payable amount")
        booking.amount = amount

    idempotency_key = payload.idempotency_key or f"booking:{booking.id}:{user.id}"
    existing = (
        await db.execute(select(Payment).where(Payment.idempotency_key == idempotency_key))
    ).scalar_one_or_none()
    if existing:
        if existing.status == PaymentStatus.PAID.value:
            raise HTTPException(status_code=400, detail="Payment already completed")
        payment = existing
        order_id = payment.provider_order_id or ""
        gateway = get_razorpay_gateway()
        settings = get_settings()
        mock = isinstance(gateway, MockRazorpayGateway)
        return PaymentOrderOut(
            payment=payment_to_out(payment),
            order_id=order_id,
            amount_paise=int(round(payment.amount * 100)),
            currency=payment.currency,
            key_id=settings.razorpay_key_id or "rzp_test_mock",
            mock=mock,
            checkout_hint="mock_complete" if mock else "razorpay_checkout",
        )

    settings = get_settings()
    commission_percent = settings.platform_commission_percent
    commission_amount, provider_amount = _split_amounts(amount, commission_percent)
    gateway = get_razorpay_gateway()
    mock = isinstance(gateway, MockRazorpayGateway)
    provider = PaymentProvider.MOCK.value if mock else PaymentProvider.RAZORPAY.value

    payment = Payment(
        payment_number=_payment_number(),
        purpose=PaymentPurpose.BOOKING.value,
        status=PaymentStatus.PENDING.value,
        provider=provider,
        amount=amount,
        currency=booking.currency or "INR",
        commission_percent=commission_percent,
        commission_amount=commission_amount,
        provider_amount=provider_amount,
        booking_id=booking.id,
        organization_id=booking.organization_id,
        doctor_id=booking.doctor_id,
        patient_id=patient.id,
        payer_user_id=user.id,
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    await db.flush()

    order = gateway.create_order(
        amount=amount,
        currency=payment.currency,
        receipt=payment.payment_number,
        notes={"payment_id": payment.id, "booking_id": booking.id, "purpose": payment.purpose},
    )
    payment.provider_order_id = order.order_id
    booking.payment_status = PaymentStatus.PENDING.value

    await write_audit(
        db,
        action="payment.order_created",
        resource_type="payment",
        resource_id=payment.id,
        actor_user_id=user.id,
        details=f"order={order.order_id} amount={amount}",
    )
    await db.commit()
    await db.refresh(payment)

    return PaymentOrderOut(
        payment=payment_to_out(payment),
        order_id=order.order_id,
        amount_paise=order.amount_paise,
        currency=order.currency,
        key_id=order.key_id,
        mock=order.mock,
        checkout_hint="mock_complete" if order.mock else "razorpay_checkout",
    )


async def create_subscription_order(
    db: AsyncSession, user: User, payload: SubscribeRequest
) -> PaymentOrderOut:
    membership = await get_membership(db, payload.organization_id, user.id)
    if not membership or membership.membership_role not in {
        MembershipRole.OWNER.value,
        MembershipRole.MANAGER.value,
    }:
        raise HTTPException(status_code=403, detail="Only org owner/manager can subscribe")

    plan = (
        await db.execute(
            select(SubscriptionPlan).where(
                SubscriptionPlan.id == payload.plan_id, SubscriptionPlan.is_active.is_(True)
            )
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    idempotency_key = payload.idempotency_key or f"sub:{payload.organization_id}:{plan.id}:{_now().strftime('%Y%m')}"
    existing = (
        await db.execute(select(Payment).where(Payment.idempotency_key == idempotency_key))
    ).scalar_one_or_none()
    if existing and existing.status == PaymentStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Subscription already paid for this period")
    if existing and existing.status == PaymentStatus.PENDING.value and existing.provider_order_id:
        gateway = get_razorpay_gateway()
        mock = isinstance(gateway, MockRazorpayGateway)
        settings = get_settings()
        return PaymentOrderOut(
            payment=payment_to_out(existing),
            order_id=existing.provider_order_id,
            amount_paise=int(round(existing.amount * 100)),
            currency=existing.currency,
            key_id=settings.razorpay_key_id or "rzp_test_mock",
            mock=mock,
            checkout_hint="mock_complete" if mock else "razorpay_checkout",
        )

    gateway = get_razorpay_gateway()
    mock = isinstance(gateway, MockRazorpayGateway)
    payment = Payment(
        payment_number=_payment_number(),
        purpose=PaymentPurpose.SUBSCRIPTION.value
        if plan.code != "FEATURED"
        else PaymentPurpose.FEATURED_LISTING.value,
        status=PaymentStatus.PENDING.value,
        provider=PaymentProvider.MOCK.value if mock else PaymentProvider.RAZORPAY.value,
        amount=plan.price_monthly,
        currency=plan.currency,
        commission_percent=0.0,
        commission_amount=0.0,
        provider_amount=0.0,
        organization_id=payload.organization_id,
        payer_user_id=user.id,
        subscription_plan_id=plan.id,
        idempotency_key=idempotency_key,
    )
    db.add(payment)
    await db.flush()

    order = gateway.create_order(
        amount=payment.amount,
        currency=payment.currency,
        receipt=payment.payment_number,
        notes={"payment_id": payment.id, "organization_id": payload.organization_id, "plan_id": plan.id},
    )
    payment.provider_order_id = order.order_id
    await db.commit()
    await db.refresh(payment)

    return PaymentOrderOut(
        payment=payment_to_out(payment),
        order_id=order.order_id,
        amount_paise=order.amount_paise,
        currency=order.currency,
        key_id=order.key_id,
        mock=order.mock,
        checkout_hint="mock_complete" if order.mock else "razorpay_checkout",
    )


async def _mark_paid(db: AsyncSession, payment: Payment, *, provider_payment_id: str, signature: str) -> Payment:
    if payment.status == PaymentStatus.PAID.value:
        return payment  # idempotent

    payment.status = PaymentStatus.PAID.value
    payment.provider_payment_id = provider_payment_id
    payment.provider_signature = signature
    payment.paid_at = _now()
    payment.failed_at = None
    payment.failure_reason = None

    if payment.booking_id:
        booking = (
            await db.execute(select(Booking).where(Booking.id == payment.booking_id))
        ).scalar_one_or_none()
        if booking:
            booking.payment_status = PaymentStatus.PAID.value
            if booking.status == BookingStatus.PENDING.value:
                booking.status = BookingStatus.CONFIRMED.value
                booking.confirmed_at = _now()

    # Invoice
    existing_invoice = (
        await db.execute(select(Invoice).where(Invoice.payment_id == payment.id))
    ).scalar_one_or_none()
    if not existing_invoice:
        db.add(
            Invoice(
                invoice_number=_invoice_number(),
                payment_id=payment.id,
                payer_user_id=payment.payer_user_id,
                organization_id=payment.organization_id,
                amount=payment.amount,
                tax_amount=0.0,
                currency=payment.currency,
                status=InvoiceStatus.ISSUED.value,
                issued_at=_now(),
                line_items_json=json.dumps(
                    [
                        {
                            "description": payment.purpose,
                            "amount": payment.amount,
                            "booking_id": payment.booking_id,
                        }
                    ]
                ),
            )
        )

    # Commission only for booking payments
    if payment.purpose == PaymentPurpose.BOOKING.value and payment.commission_amount > 0:
        existing_comm = (
            await db.execute(select(PlatformCommission).where(PlatformCommission.payment_id == payment.id))
        ).scalar_one_or_none()
        if not existing_comm:
            db.add(
                PlatformCommission(
                    payment_id=payment.id,
                    booking_id=payment.booking_id,
                    organization_id=payment.organization_id,
                    doctor_id=payment.doctor_id,
                    gross_amount=payment.amount,
                    commission_percent=payment.commission_percent,
                    commission_amount=payment.commission_amount,
                    provider_amount=payment.provider_amount,
                    currency=payment.currency,
                    is_settled=False,
                )
            )

    # Activate subscription
    if payment.purpose in {PaymentPurpose.SUBSCRIPTION.value, PaymentPurpose.FEATURED_LISTING.value}:
        if payment.subscription_plan_id and payment.organization_id:
            plan = (
                await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.id == payment.subscription_plan_id))
            ).scalar_one_or_none()
            starts = _now()
            ends = starts + timedelta(days=30)
            sub = OrganizationSubscription(
                organization_id=payment.organization_id,
                plan_id=payment.subscription_plan_id,
                status=SubscriptionStatus.ACTIVE.value,
                starts_at=starts,
                ends_at=ends,
                auto_renew=True,
                payment_id=payment.id,
            )
            db.add(sub)
            if plan and plan.featured_listings > 0:
                listings = (
                    await db.execute(
                        select(Listing)
                        .where(Listing.organization_id == payment.organization_id)
                        .limit(plan.featured_listings)
                    )
                ).scalars().all()
                for listing in listings:
                    listing.is_featured = True

    # Ledger
    existing_txn = (
        await db.execute(
            select(LedgerTransaction).where(
                LedgerTransaction.payment_id == payment.id,
                LedgerTransaction.transaction_type == TransactionType.PAYMENT.value,
            )
        )
    ).scalar_one_or_none()
    if not existing_txn:
        db.add(
            LedgerTransaction(
                transaction_number=_txn_number(),
                transaction_type=TransactionType.PAYMENT.value
                if payment.purpose == PaymentPurpose.BOOKING.value
                else TransactionType.SUBSCRIPTION.value,
                payment_id=payment.id,
                amount=payment.amount,
                currency=payment.currency,
                direction="IN",
                description=f"{payment.purpose} payment {payment.payment_number}",
                reference=provider_payment_id,
            )
        )
        if payment.commission_amount > 0:
            db.add(
                LedgerTransaction(
                    transaction_number=_txn_number(),
                    transaction_type=TransactionType.COMMISSION.value,
                    payment_id=payment.id,
                    amount=payment.commission_amount,
                    currency=payment.currency,
                    direction="IN",
                    description=f"Platform commission on {payment.payment_number}",
                    reference=payment.id,
                )
            )

    await notify_user(
        db,
        user_id=payment.payer_user_id,
        event_type="payment.success",
        title="Payment successful",
        body=f"Payment {payment.payment_number} of ₹{payment.amount:.0f} succeeded.",
        payload={"payment_id": payment.id, "booking_id": payment.booking_id},
    )
    await write_audit(
        db,
        action="payment.paid",
        resource_type="payment",
        resource_id=payment.id,
        actor_user_id=payment.payer_user_id,
        details=f"provider_payment_id={provider_payment_id}",
    )
    return payment


async def verify_payment(db: AsyncSession, user: User, payload: PaymentVerify) -> PaymentOut:
    payment = (await db.execute(select(Payment).where(Payment.id == payload.payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.payer_user_id != user.id and not set(user_role_codes(user)).intersection(ADMIN_ROLES):
        raise HTTPException(status_code=403, detail="Not allowed")
    if payment.provider_order_id and payment.provider_order_id != payload.provider_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch")

    gateway = get_razorpay_gateway()
    if not gateway.verify_payment_signature(
        order_id=payload.provider_order_id,
        payment_id=payload.provider_payment_id,
        signature=payload.provider_signature,
    ):
        payment.status = PaymentStatus.FAILED.value
        payment.failed_at = _now()
        payment.failure_reason = "Invalid payment signature"
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    await _mark_paid(
        db,
        payment,
        provider_payment_id=payload.provider_payment_id,
        signature=payload.provider_signature,
    )
    await db.commit()
    await db.refresh(payment)
    return payment_to_out(payment)


async def mock_complete_payment(db: AsyncSession, user: User, payment_id: str) -> PaymentOut:
    """Dev helper: complete a mock Razorpay order without frontend checkout SDK."""
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.payer_user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    if not isinstance(get_razorpay_gateway(), MockRazorpayGateway):
        raise HTTPException(status_code=400, detail="Mock complete only available in mock mode")
    if not payment.provider_order_id:
        raise HTTPException(status_code=400, detail="Payment has no order")

    pay_id = MockRazorpayGateway.mock_payment_id()
    signature = MockRazorpayGateway.mock_signature(payment.provider_order_id, pay_id)
    await _mark_paid(db, payment, provider_payment_id=pay_id, signature=signature)
    await db.commit()
    await db.refresh(payment)
    return payment_to_out(payment)


async def handle_webhook(db: AsyncSession, body: bytes, signature: str) -> dict:
    gateway = get_razorpay_gateway()
    if not gateway.verify_webhook_signature(body=body, signature=signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = parse_webhook_event(body)
    event_name = event.get("event")
    payload = event.get("payload", {})
    payment_entity = (payload.get("payment") or {}).get("entity") or {}
    order_id = payment_entity.get("order_id")
    provider_payment_id = payment_entity.get("id")

    if event_name == "payment.captured" and order_id and provider_payment_id:
        payment = (
            await db.execute(select(Payment).where(Payment.provider_order_id == order_id))
        ).scalar_one_or_none()
        if payment:
            await _mark_paid(
                db,
                payment,
                provider_payment_id=provider_payment_id,
                signature=signature or "webhook",
            )
            await db.commit()
            return {"status": "ok", "payment_id": payment.id}

    if event_name == "payment.failed" and order_id:
        payment = (
            await db.execute(select(Payment).where(Payment.provider_order_id == order_id))
        ).scalar_one_or_none()
        if payment and payment.status != PaymentStatus.PAID.value:
            payment.status = PaymentStatus.FAILED.value
            payment.failed_at = _now()
            payment.failure_reason = payment_entity.get("error_description") or "Payment failed"
            if payment.booking_id:
                booking = (
                    await db.execute(select(Booking).where(Booking.id == payment.booking_id))
                ).scalar_one_or_none()
                if booking and booking.payment_status != PaymentStatus.PAID.value:
                    booking.payment_status = PaymentStatus.FAILED.value
            await db.commit()
            return {"status": "failed_recorded", "payment_id": payment.id}

    return {"status": "ignored", "event": event_name}


async def list_my_payments(db: AsyncSession, user: User) -> List[PaymentOut]:
    rows = (
        await db.execute(
            select(Payment).where(Payment.payer_user_id == user.id).order_by(Payment.created_at.desc()).limit(100)
        )
    ).scalars().all()
    return [payment_to_out(p) for p in rows]


async def get_payment(db: AsyncSession, user: User, payment_id: str) -> PaymentOut:
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    roles = set(user_role_codes(user))
    if payment.payer_user_id != user.id and not roles.intersection(ADMIN_ROLES):
        # Provider may view payments for their bookings
        allowed = False
        if payment.organization_id:
            membership = await get_membership(db, payment.organization_id, user.id)
            allowed = membership is not None
        if payment.doctor_id:
            doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
            allowed = allowed or (doctor is not None and doctor.id == payment.doctor_id)
        if not allowed:
            raise HTTPException(status_code=403, detail="Not allowed")
    return payment_to_out(payment)


async def get_invoice_for_payment(db: AsyncSession, user: User, payment_id: str) -> InvoiceOut:
    await get_payment(db, user, payment_id)
    invoice = (await db.execute(select(Invoice).where(Invoice.payment_id == payment_id))).scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceOut.model_validate(invoice)


async def create_refund(db: AsyncSession, user: User, payment_id: str, payload: RefundCreate) -> RefundOut:
    roles = set(user_role_codes(user))
    payment = (await db.execute(select(Payment).where(Payment.id == payment_id))).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.status != PaymentStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Only paid payments can be refunded")
    if payment.payer_user_id != user.id and not roles.intersection(ADMIN_ROLES):
        raise HTTPException(status_code=403, detail="Not allowed")

    amount = payload.amount if payload.amount is not None else payment.amount
    if amount <= 0 or amount > payment.amount:
        raise HTTPException(status_code=400, detail="Invalid refund amount")

    gateway = get_razorpay_gateway()
    provider_payment_id = payment.provider_payment_id or f"pay_local_{payment.id[:8]}"
    result = gateway.create_refund(payment_id=provider_payment_id, amount_paise=int(round(amount * 100)))

    refund = Refund(
        payment_id=payment.id,
        amount=amount,
        currency=payment.currency,
        status=RefundStatus.PROCESSED.value,
        reason=payload.reason,
        provider_refund_id=result.get("id"),
        processed_at=_now(),
        initiated_by=user.id,
    )
    db.add(refund)
    payment.status = PaymentStatus.REFUNDED.value
    if payment.booking_id:
        booking = (await db.execute(select(Booking).where(Booking.id == payment.booking_id))).scalar_one_or_none()
        if booking:
            booking.payment_status = PaymentStatus.REFUNDED.value
            booking.status = BookingStatus.REFUNDED.value

    db.add(
        LedgerTransaction(
            transaction_number=_txn_number(),
            transaction_type=TransactionType.REFUND.value,
            payment_id=payment.id,
            amount=amount,
            currency=payment.currency,
            direction="OUT",
            description=f"Refund for {payment.payment_number}",
            reference=result.get("id"),
        )
    )
    await notify_user(
        db,
        user_id=payment.payer_user_id,
        event_type="payment.refund",
        title="Refund processed",
        body=f"Refund of ₹{amount:.0f} for {payment.payment_number} has been processed.",
        payload={"payment_id": payment.id},
    )
    await db.commit()
    await db.refresh(refund)
    return RefundOut.model_validate(refund)


async def list_plans(db: AsyncSession, active_only: bool = True) -> List[SubscriptionPlanOut]:
    q = select(SubscriptionPlan).order_by(SubscriptionPlan.sort_order, SubscriptionPlan.price_monthly)
    if active_only:
        q = q.where(SubscriptionPlan.is_active.is_(True))
    rows = (await db.execute(q)).scalars().all()
    return [SubscriptionPlanOut.model_validate(r) for r in rows]


async def create_plan(db: AsyncSession, payload: SubscriptionPlanCreate) -> SubscriptionPlanOut:
    existing = (
        await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == payload.code))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Plan code already exists")
    plan = SubscriptionPlan(**payload.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return SubscriptionPlanOut.model_validate(plan)


async def list_org_subscriptions(db: AsyncSession, user: User, organization_id: str) -> List[OrganizationSubscriptionOut]:
    membership = await get_membership(db, organization_id, user.id)
    if not membership and not set(user_role_codes(user)).intersection(ADMIN_ROLES):
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    rows = (
        await db.execute(
            select(OrganizationSubscription)
            .options(selectinload(OrganizationSubscription.plan))
            .where(OrganizationSubscription.organization_id == organization_id)
            .order_by(OrganizationSubscription.created_at.desc())
        )
    ).scalars().all()
    out: List[OrganizationSubscriptionOut] = []
    for row in rows:
        item = OrganizationSubscriptionOut.model_validate(row)
        if row.plan:
            item.plan_code = row.plan.code
            item.plan_name = row.plan.name
        out.append(item)
    return out


async def list_commissions(db: AsyncSession, unsettled_only: bool = False) -> List[CommissionOut]:
    q = select(PlatformCommission).order_by(PlatformCommission.created_at.desc()).limit(200)
    if unsettled_only:
        q = q.where(PlatformCommission.is_settled.is_(False))
    rows = (await db.execute(q)).scalars().all()
    return [CommissionOut.model_validate(r) for r in rows]


async def create_payout(db: AsyncSession, user: User, payload: PayoutCreate) -> PayoutOut:
    if not payload.organization_id and not payload.doctor_id:
        raise HTTPException(status_code=400, detail="organization_id or doctor_id required")

    commissions: List[PlatformCommission] = []
    if payload.settle_commission_ids:
        commissions = list(
            (
                await db.execute(
                    select(PlatformCommission).where(
                        PlatformCommission.id.in_(payload.settle_commission_ids),
                        PlatformCommission.is_settled.is_(False),
                    )
                )
            ).scalars().all()
        )
    else:
        filters = [PlatformCommission.is_settled.is_(False)]
        if payload.organization_id:
            filters.append(PlatformCommission.organization_id == payload.organization_id)
        if payload.doctor_id:
            filters.append(PlatformCommission.doctor_id == payload.doctor_id)
        commissions = list((await db.execute(select(PlatformCommission).where(*filters))).scalars().all())

    amount = payload.amount
    if amount is None:
        amount = round(sum(c.provider_amount for c in commissions), 2)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Nothing to payout")

    payout = ProviderPayout(
        payout_number=_payout_number(),
        organization_id=payload.organization_id,
        doctor_id=payload.doctor_id,
        amount=amount,
        currency="INR",
        status=PayoutStatus.PAID.value,
        period_start=payload.period_start,
        period_end=payload.period_end,
        notes=payload.notes,
        paid_at=_now(),
        created_by=user.id,
    )
    db.add(payout)
    await db.flush()

    for commission in commissions:
        commission.is_settled = True
        commission.payout_id = payout.id

    db.add(
        LedgerTransaction(
            transaction_number=_txn_number(),
            transaction_type=TransactionType.PAYOUT.value,
            payment_id=None,
            amount=amount,
            currency="INR",
            direction="OUT",
            description=f"Provider payout {payout.payout_number}",
            reference=payout.id,
        )
    )
    await write_audit(
        db,
        action="payout.created",
        resource_type="provider_payout",
        resource_id=payout.id,
        actor_user_id=user.id,
        details=f"amount={amount}",
    )
    await db.commit()
    await db.refresh(payout)
    return PayoutOut.model_validate(payout)


async def list_payouts(
    db: AsyncSession,
    user: User,
    organization_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
) -> List[PayoutOut]:
    roles = set(user_role_codes(user))
    q = select(ProviderPayout).order_by(ProviderPayout.created_at.desc()).limit(100)
    if organization_id:
        if not roles.intersection(ADMIN_ROLES):
            membership = await get_membership(db, organization_id, user.id)
            if not membership:
                raise HTTPException(status_code=403, detail="Not allowed")
        q = q.where(ProviderPayout.organization_id == organization_id)
    elif doctor_id:
        doctor = (await db.execute(select(Doctor).where(Doctor.id == doctor_id))).scalar_one_or_none()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        if doctor.user_id != user.id and not roles.intersection(ADMIN_ROLES):
            raise HTTPException(status_code=403, detail="Not allowed")
        q = q.where(ProviderPayout.doctor_id == doctor_id)
    elif not roles.intersection(ADMIN_ROLES):
        # Provider: own orgs + own doctor
        org_ids = (
            await db.execute(
                select(OrganizationMember.organization_id).where(
                    OrganizationMember.user_id == user.id, OrganizationMember.is_active.is_(True)
                )
            )
        ).scalars().all()
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        from sqlalchemy import or_

        clauses = []
        if org_ids:
            clauses.append(ProviderPayout.organization_id.in_(list(org_ids)))
        if doctor:
            clauses.append(ProviderPayout.doctor_id == doctor.id)
        if not clauses:
            return []
        q = q.where(or_(*clauses))

    rows = (await db.execute(q)).scalars().all()
    return [PayoutOut.model_validate(r) for r in rows]


async def earnings_summary(
    db: AsyncSession,
    user: User,
    organization_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
) -> EarningsSummary:
    roles = set(user_role_codes(user))
    filters = []
    if organization_id:
        if not roles.intersection(ADMIN_ROLES):
            membership = await get_membership(db, organization_id, user.id)
            if not membership:
                raise HTTPException(status_code=403, detail="Not allowed")
        filters.append(PlatformCommission.organization_id == organization_id)
    elif doctor_id:
        doctor = (await db.execute(select(Doctor).where(Doctor.id == doctor_id))).scalar_one_or_none()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        if doctor.user_id != user.id and not roles.intersection(ADMIN_ROLES):
            raise HTTPException(status_code=403, detail="Not allowed")
        filters.append(PlatformCommission.doctor_id == doctor_id)
    else:
        doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        org_ids = (
            await db.execute(
                select(OrganizationMember.organization_id).where(
                    OrganizationMember.user_id == user.id, OrganizationMember.is_active.is_(True)
                )
            )
        ).scalars().all()
        from sqlalchemy import or_

        clauses = []
        if doctor:
            clauses.append(PlatformCommission.doctor_id == doctor.id)
        if org_ids:
            clauses.append(PlatformCommission.organization_id.in_(list(org_ids)))
        if not clauses and not roles.intersection(ADMIN_ROLES):
            return EarningsSummary(gross_collected=0, commission_total=0, provider_earnings=0, unsettled_amount=0)
        if clauses:
            filters.append(or_(*clauses))

    q = select(
        func.coalesce(func.sum(PlatformCommission.gross_amount), 0.0),
        func.coalesce(func.sum(PlatformCommission.commission_amount), 0.0),
        func.coalesce(func.sum(PlatformCommission.provider_amount), 0.0),
    )
    if filters:
        q = q.where(*filters)
    gross, commission, provider = (await db.execute(q)).one()

    unsettled_q = select(func.coalesce(func.sum(PlatformCommission.provider_amount), 0.0)).where(
        PlatformCommission.is_settled.is_(False)
    )
    if filters:
        unsettled_q = unsettled_q.where(*filters)
    unsettled = (await db.execute(unsettled_q)).scalar_one()

    return EarningsSummary(
        gross_collected=float(gross or 0),
        commission_total=float(commission or 0),
        provider_earnings=float(provider or 0),
        unsettled_amount=float(unsettled or 0),
    )


async def ensure_default_plans(db: AsyncSession) -> None:
    defaults = [
        {
            "code": "BASIC",
            "name": "Basic",
            "description": "List your organization and manage bookings",
            "price_monthly": 999.0,
            "featured_listings": 0,
            "sort_order": 1,
            "features_json": json.dumps(["Directory listing", "Booking inbox", "Basic analytics"]),
        },
        {
            "code": "GROWTH",
            "name": "Growth",
            "description": "Priority placement and more visibility",
            "price_monthly": 2499.0,
            "featured_listings": 1,
            "sort_order": 2,
            "features_json": json.dumps(["Everything in Basic", "1 featured listing", "Commission insights"]),
        },
        {
            "code": "FEATURED",
            "name": "Featured Boost",
            "description": "Highlight up to 3 listings on marketplace home",
            "price_monthly": 4999.0,
            "featured_listings": 3,
            "sort_order": 3,
            "features_json": json.dumps(["3 featured listings", "Homepage spotlight", "Support priority"]),
        },
    ]
    for item in defaults:
        existing = (
            await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.code == item["code"]))
        ).scalar_one_or_none()
        if not existing:
            db.add(SubscriptionPlan(**item, currency="INR", is_active=True))
    await db.commit()
