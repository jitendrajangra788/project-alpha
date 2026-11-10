from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import VideoSessionStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class VideoSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "video_sessions"

    booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id"), unique=True, nullable=False)
    consultation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("consultations.id"), nullable=True)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=False, index=True)
    room_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default=VideoSessionStatus.SCHEDULED.value, nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(40), default="webrtc_mock", nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    doctor_joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    patient_joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    end_reason: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
