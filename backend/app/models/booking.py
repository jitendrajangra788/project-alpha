from datetime import date, datetime, time
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import BookingStatus, PaymentStatus, SlotStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class AppointmentSlot(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "appointment_slots"
    __table_args__ = (
        UniqueConstraint(
            "listing_id",
            "slot_date",
            "start_time",
            name="uq_listing_slot_datetime",
        ),
    )

    listing_id: Mapped[str] = mapped_column(String(36), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=True)
    doctor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=True)
    slot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=SlotStatus.OPEN.value, nullable=False, index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    booked_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    bookings: Mapped[List["Booking"]] = relationship(back_populates="slot")


class Booking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "bookings"

    booking_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    booking_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default=BookingStatus.PENDING.value, nullable=False, index=True)
    payment_status: Mapped[str] = mapped_column(String(20), default=PaymentStatus.UNPAID.value, nullable=False)

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    patient_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    listing_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("listings.id"), nullable=True, index=True)
    organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=True, index=True)
    doctor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=True, index=True)
    slot_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("appointment_slots.id"), nullable=True)

    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    service_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)

    patient_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    address_line: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    pin_code: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    is_home_service: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    slot: Mapped[Optional["AppointmentSlot"]] = relationship(back_populates="bookings")
    status_history: Mapped[List["BookingStatusHistory"]] = relationship(
        back_populates="booking", cascade="all, delete-orphan"
    )


class BookingStatusHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "booking_status_history"

    booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    from_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    booking: Mapped["Booking"] = relationship(back_populates="status_history")


class Notification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    channel: Mapped[str] = mapped_column(String(20), default="in_app", nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_via: Mapped[str] = mapped_column(String(40), default="mock", nullable=False)
