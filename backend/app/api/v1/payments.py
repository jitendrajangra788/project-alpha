from typing import List, Optional

from fastapi import APIRouter, Header, Query, Request

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.schemas.payment import (
    CommissionOut,
    EarningsSummary,
    InvoiceOut,
    PaymentCreateOrder,
    PaymentOrderOut,
    PaymentOut,
    PaymentVerify,
    PayoutCreate,
    PayoutOut,
    RefundCreate,
    RefundOut,
)
from app.services import payments as payment_service

router = APIRouter()


@router.post("/orders", response_model=PaymentOrderOut)
async def create_order(payload: PaymentCreateOrder, user: CurrentUser, db: DbSession):
    return await payment_service.create_booking_payment_order(db, user, payload)


@router.post("/verify", response_model=PaymentOut)
async def verify(payload: PaymentVerify, user: CurrentUser, db: DbSession):
    return await payment_service.verify_payment(db, user, payload)


@router.post("/webhook")
async def webhook(
    request: Request,
    db: DbSession,
    x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature"),
):
    body = await request.body()
    return await payment_service.handle_webhook(db, body, x_razorpay_signature or "")


@router.get("/me", response_model=List[PaymentOut])
async def my_payments(user: CurrentUser, db: DbSession):
    return await payment_service.list_my_payments(db, user)


@router.get("/earnings", response_model=EarningsSummary)
async def earnings(
    user: CurrentUser,
    db: DbSession,
    organization_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
):
    return await payment_service.earnings_summary(db, user, organization_id, doctor_id)


@router.get("/commissions", response_model=List[CommissionOut])
async def commissions(
    _: AdminUser,
    db: DbSession,
    unsettled_only: bool = Query(False),
):
    return await payment_service.list_commissions(db, unsettled_only=unsettled_only)


@router.post("/payouts", response_model=PayoutOut)
async def create_payout(payload: PayoutCreate, user: AdminUser, db: DbSession):
    return await payment_service.create_payout(db, user, payload)


@router.get("/payouts", response_model=List[PayoutOut])
async def list_payouts(
    user: CurrentUser,
    db: DbSession,
    organization_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
):
    return await payment_service.list_payouts(db, user, organization_id, doctor_id)


@router.post("/{payment_id}/mock-complete", response_model=PaymentOut)
async def mock_complete(payment_id: str, user: CurrentUser, db: DbSession):
    return await payment_service.mock_complete_payment(db, user, payment_id)


@router.get("/{payment_id}", response_model=PaymentOut)
async def get_payment(payment_id: str, user: CurrentUser, db: DbSession):
    return await payment_service.get_payment(db, user, payment_id)


@router.get("/{payment_id}/invoice", response_model=InvoiceOut)
async def get_invoice(payment_id: str, user: CurrentUser, db: DbSession):
    return await payment_service.get_invoice_for_payment(db, user, payment_id)


@router.post("/{payment_id}/refund", response_model=RefundOut)
async def refund(payment_id: str, payload: RefundCreate, user: CurrentUser, db: DbSession):
    return await payment_service.create_refund(db, user, payment_id, payload)
