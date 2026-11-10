from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import (
    InvoiceStatus,
    PaymentProvider,
    PaymentPurpose,
    PaymentStatus,
    PayoutStatus,
    RefundStatus,
    SubscriptionStatus,
)
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class SubscriptionPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subscription_plans"
    __table_args__ = (UniqueConstraint("code", name="uq_subscription_plan_code"),)

    code: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_monthly: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    features_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    featured_listings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    subscriptions: Mapped[List["OrganizationSubscription"]] = relationship(back_populates="plan")


class OrganizationSubscription(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organization_subscriptions"

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[str] = mapped_column(String(36), ForeignKey("subscription_plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=SubscriptionStatus.ACTIVE.value, nullable=False, index=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    payment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payments.id"), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    plan: Mapped["SubscriptionPlan"] = relationship(back_populates="subscriptions")


class Payment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "payments"

    payment_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(40), default=PaymentPurpose.BOOKING.value, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.PENDING.value, nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(20), default=PaymentProvider.MOCK.value, nullable=False)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    commission_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    provider_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    booking_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bookings.id"), nullable=True, index=True)
    organization_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True, index=True
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=True, index=True)
    patient_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("patients.id"), nullable=True, index=True)
    payer_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    subscription_plan_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("subscription_plans.id"), nullable=True
    )

    provider_order_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    provider_payment_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    provider_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    refunds: Mapped[List["Refund"]] = relationship(back_populates="payment", cascade="all, delete-orphan")
    invoice: Mapped[Optional["Invoice"]] = relationship(back_populates="payment", uselist=False)
    commission: Mapped[Optional["PlatformCommission"]] = relationship(back_populates="payment", uselist=False)


class Refund(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "refunds"

    payment_id: Mapped[str] = mapped_column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=RefundStatus.PENDING.value, nullable=False, index=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_refund_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    initiated_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    payment: Mapped["Payment"] = relationship(back_populates="refunds")


class Invoice(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "invoices"

    invoice_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    payment_id: Mapped[str] = mapped_column(String(36), ForeignKey("payments.id"), unique=True, nullable=False)
    payer_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=InvoiceStatus.ISSUED.value, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    line_items_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    payment: Mapped["Payment"] = relationship(back_populates="invoice")


class PlatformCommission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "platform_commissions"

    payment_id: Mapped[str] = mapped_column(String(36), ForeignKey("payments.id"), unique=True, nullable=False)
    booking_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bookings.id"), nullable=True, index=True)
    organization_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True, index=True
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=True, index=True)
    gross_amount: Mapped[float] = mapped_column(Float, nullable=False)
    commission_percent: Mapped[float] = mapped_column(Float, nullable=False)
    commission_amount: Mapped[float] = mapped_column(Float, nullable=False)
    provider_amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    payout_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("provider_payouts.id"), nullable=True)

    payment: Mapped["Payment"] = relationship(back_populates="commission")


class ProviderPayout(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "provider_payouts"

    payout_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    organization_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=True, index=True
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=PayoutStatus.PENDING.value, nullable=False, index=True)
    period_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    period_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)


class LedgerTransaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "transactions"

    transaction_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    transaction_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    payment_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("payments.id"), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # IN / OUT
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
