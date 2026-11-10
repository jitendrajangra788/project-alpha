from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import VerificationStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Doctor(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "doctors"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    specialty: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    sub_specialty: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    qualification: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registration_number: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    registration_council: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    consultation_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    online_consultation_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    clinic_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    pin_code: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    about: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    languages: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(40), default=VerificationStatus.DRAFT.value, nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="doctor")
