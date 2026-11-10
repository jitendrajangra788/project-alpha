"""phase6 payments

Revision ID: 0006_phase6
Revises: 0005_phase5
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_phase6"
down_revision: Union[str, None] = "0005_phase5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_monthly", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("features_json", sa.Text(), nullable=True),
        sa.Column("featured_listings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("code", name="uq_subscription_plan_code"),
    )
    op.create_index("ix_subscription_plans_code", "subscription_plans", ["code"])

    op.create_table(
        "provider_payouts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("payout_number", sa.String(32), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctors.id"), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("payout_number"),
    )
    op.create_index("ix_provider_payouts_payout_number", "provider_payouts", ["payout_number"])
    op.create_index("ix_provider_payouts_organization_id", "provider_payouts", ["organization_id"])
    op.create_index("ix_provider_payouts_doctor_id", "provider_payouts", ["doctor_id"])
    op.create_index("ix_provider_payouts_status", "provider_payouts", ["status"])

    op.create_table(
        "payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("payment_number", sa.String(32), nullable=False),
        sa.Column("purpose", sa.String(40), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("provider", sa.String(20), nullable=False, server_default="MOCK"),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("commission_percent", sa.Float(), nullable=False, server_default="0"),
        sa.Column("commission_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("provider_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("bookings.id"), nullable=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctors.id"), nullable=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=True),
        sa.Column("payer_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subscription_plan_id", sa.String(36), sa.ForeignKey("subscription_plans.id"), nullable=True),
        sa.Column("provider_order_id", sa.String(120), nullable=True),
        sa.Column("provider_payment_id", sa.String(120), nullable=True),
        sa.Column("provider_signature", sa.String(255), nullable=True),
        sa.Column("idempotency_key", sa.String(64), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("payment_number"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_payments_payment_number", "payments", ["payment_number"])
    op.create_index("ix_payments_purpose", "payments", ["purpose"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_booking_id", "payments", ["booking_id"])
    op.create_index("ix_payments_organization_id", "payments", ["organization_id"])
    op.create_index("ix_payments_doctor_id", "payments", ["doctor_id"])
    op.create_index("ix_payments_patient_id", "payments", ["patient_id"])
    op.create_index("ix_payments_payer_user_id", "payments", ["payer_user_id"])
    op.create_index("ix_payments_provider_order_id", "payments", ["provider_order_id"])
    op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"])

    op.create_table(
        "organization_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("plan_id", sa.String(36), sa.ForeignKey("subscription_plans.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id"), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_organization_subscriptions_organization_id", "organization_subscriptions", ["organization_id"])
    op.create_index("ix_organization_subscriptions_status", "organization_subscriptions", ["status"])

    op.create_table(
        "refunds",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("provider_refund_id", sa.String(120), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("initiated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_refunds_status", "refunds", ["status"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invoice_number", sa.String(40), nullable=False),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id"), nullable=False),
        sa.Column("payer_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(20), nullable=False, server_default="ISSUED"),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("line_items_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("invoice_number"),
        sa.UniqueConstraint("payment_id"),
    )
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"])

    op.create_table(
        "platform_commissions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id"), nullable=False),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("bookings.id"), nullable=True),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctors.id"), nullable=True),
        sa.Column("gross_amount", sa.Float(), nullable=False),
        sa.Column("commission_percent", sa.Float(), nullable=False),
        sa.Column("commission_amount", sa.Float(), nullable=False),
        sa.Column("provider_amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("is_settled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("payout_id", sa.String(36), sa.ForeignKey("provider_payouts.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("payment_id"),
    )
    op.create_index("ix_platform_commissions_booking_id", "platform_commissions", ["booking_id"])
    op.create_index("ix_platform_commissions_organization_id", "platform_commissions", ["organization_id"])
    op.create_index("ix_platform_commissions_doctor_id", "platform_commissions", ["doctor_id"])
    op.create_index("ix_platform_commissions_is_settled", "platform_commissions", ["is_settled"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("transaction_number", sa.String(32), nullable=False),
        sa.Column("transaction_type", sa.String(40), nullable=False),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id"), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="INR"),
        sa.Column("direction", sa.String(10), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("reference", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("transaction_number"),
    )
    op.create_index("ix_transactions_transaction_number", "transactions", ["transaction_number"])
    op.create_index("ix_transactions_transaction_type", "transactions", ["transaction_type"])
    op.create_index("ix_transactions_payment_id", "transactions", ["payment_id"])


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("platform_commissions")
    op.drop_table("invoices")
    op.drop_table("refunds")
    op.drop_table("organization_subscriptions")
    op.drop_table("payments")
    op.drop_table("provider_payouts")
    op.drop_table("subscription_plans")
