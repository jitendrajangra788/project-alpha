"""phase3 bookings

Revision ID: 0003_phase3
Revises: 0002_phase2
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_phase3"
down_revision: Union[str, None] = "0002_phase2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "appointment_slots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("listing_id", sa.String(length=36), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("doctor_id", sa.String(length=36), sa.ForeignKey("doctors.id"), nullable=True),
        sa.Column("slot_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="OPEN"),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("booked_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("listing_id", "slot_date", "start_time", name="uq_listing_slot_datetime"),
    )
    op.create_index("ix_appointment_slots_listing_id", "appointment_slots", ["listing_id"])
    op.create_index("ix_appointment_slots_slot_date", "appointment_slots", ["slot_date"])
    op.create_index("ix_appointment_slots_status", "appointment_slots", ["status"])

    op.create_table(
        "bookings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("booking_number", sa.String(length=32), nullable=False),
        sa.Column("booking_type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="UNPAID"),
        sa.Column("patient_id", sa.String(length=36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("patient_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("listing_id", sa.String(length=36), sa.ForeignKey("listings.id"), nullable=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id"), nullable=True),
        sa.Column("doctor_id", sa.String(length=36), sa.ForeignKey("doctors.id"), nullable=True),
        sa.Column("slot_id", sa.String(length=36), sa.ForeignKey("appointment_slots.id"), nullable=True),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("service_name", sa.String(length=160), nullable=True),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="INR"),
        sa.Column("patient_notes", sa.Text(), nullable=True),
        sa.Column("provider_notes", sa.Text(), nullable=True),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("address_line", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=True),
        sa.Column("pin_code", sa.String(length=12), nullable=True),
        sa.Column("is_home_service", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_online", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("booking_number"),
    )
    op.create_index("ix_bookings_booking_number", "bookings", ["booking_number"])
    op.create_index("ix_bookings_booking_type", "bookings", ["booking_type"])
    op.create_index("ix_bookings_status", "bookings", ["status"])
    op.create_index("ix_bookings_patient_id", "bookings", ["patient_id"])
    op.create_index("ix_bookings_patient_user_id", "bookings", ["patient_user_id"])
    op.create_index("ix_bookings_listing_id", "bookings", ["listing_id"])
    op.create_index("ix_bookings_organization_id", "bookings", ["organization_id"])
    op.create_index("ix_bookings_doctor_id", "bookings", ["doctor_id"])
    op.create_index("ix_bookings_scheduled_date", "bookings", ["scheduled_date"])

    op.create_table(
        "booking_status_history",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("booking_id", sa.String(length=36), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("changed_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False, server_default="in_app"),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sent_via", sa.String(length=40), nullable=False, server_default="mock"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_event_type", "notifications", ["event_type"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("booking_status_history")
    op.drop_table("bookings")
    op.drop_table("appointment_slots")
