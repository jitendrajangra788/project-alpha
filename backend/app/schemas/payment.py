from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class PaymentCreateOrder(BaseModel):
    booking_id: str
    idempotency_key: Optional[str] = Field(default=None, max_length=64)


class PaymentVerify(BaseModel):
    payment_id: str
    provider_order_id: str
    provider_payment_id: str
    provider_signature: str


class PaymentOut(BaseModel):
    id: str
    payment_number: str
    purpose: str
    status: str
    provider: str
    amount: float
    currency: str
    commission_percent: float
    commission_amount: float
    provider_amount: float
    booking_id: Optional[str] = None
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    patient_id: Optional[str] = None
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentOrderOut(BaseModel):
    payment: PaymentOut
    order_id: str
    amount_paise: int
    currency: str
    key_id: str
    mock: bool
    checkout_hint: str


class RefundCreate(BaseModel):
    amount: Optional[float] = None
    reason: Optional[str] = Field(default=None, max_length=500)


class RefundOut(BaseModel):
    id: str
    payment_id: str
    amount: float
    currency: str
    status: str
    reason: Optional[str] = None
    provider_refund_id: Optional[str] = None
    processed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    payment_id: str
    amount: float
    tax_amount: float
    currency: str
    status: str
    issued_at: datetime
    line_items_json: Optional[str] = None

    model_config = {"from_attributes": True}


class CommissionOut(BaseModel):
    id: str
    payment_id: str
    booking_id: Optional[str] = None
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    gross_amount: float
    commission_percent: float
    commission_amount: float
    provider_amount: float
    currency: str
    is_settled: bool
    payout_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PayoutCreate(BaseModel):
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    amount: Optional[float] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    notes: Optional[str] = None
    settle_commission_ids: Optional[List[str]] = None


class PayoutOut(BaseModel):
    id: str
    payout_number: str
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    notes: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionPlanOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    price_monthly: float
    currency: str
    features_json: Optional[str] = None
    featured_listings: int
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


class SubscriptionPlanCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    price_monthly: float
    currency: str = "INR"
    features_json: Optional[str] = None
    featured_listings: int = 0
    is_active: bool = True
    sort_order: int = 0


class SubscribeRequest(BaseModel):
    organization_id: str
    plan_id: str
    idempotency_key: Optional[str] = None


class OrganizationSubscriptionOut(BaseModel):
    id: str
    organization_id: str
    plan_id: str
    plan_code: Optional[str] = None
    plan_name: Optional[str] = None
    status: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    auto_renew: bool
    payment_id: Optional[str] = None
    cancelled_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class EarningsSummary(BaseModel):
    gross_collected: float
    commission_total: float
    provider_earnings: float
    unsettled_amount: float
    currency: str = "INR"
