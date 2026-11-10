from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import MembershipRole, OrganizationType, VerificationStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    organization_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    owner_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    pin_code: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(40), default=VerificationStatus.DRAFT.value, nullable=False, index=True
    )

    members: Mapped[List["OrganizationMember"]] = relationship(back_populates="organization", cascade="all, delete-orphan")
    locations: Mapped[List["OrganizationLocation"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    documents: Mapped[List["OrganizationDocument"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    verification: Mapped[Optional["OrganizationVerification"]] = relationship(
        back_populates="organization", uselist=False, cascade="all, delete-orphan"
    )


class OrganizationMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_member"),)

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    membership_role: Mapped[str] = mapped_column(String(40), default=MembershipRole.STAFF.value, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="memberships")


class OrganizationLocation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organization_locations"

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    address_line: Mapped[str] = mapped_column(String(500), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    pin_code: Mapped[str] = mapped_column(String(12), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="locations")


class OrganizationDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organization_documents"

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    document_type: Mapped[str] = mapped_column(String(80), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="documents")


class OrganizationVerification(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "organization_verifications"

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(String(40), default=VerificationStatus.PENDING.value, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_documents: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="verification")


# Re-export enums for convenience in type checkers
__all__ = [
    "Organization",
    "OrganizationMember",
    "OrganizationLocation",
    "OrganizationDocument",
    "OrganizationVerification",
    "OrganizationType",
    "VerificationStatus",
    "MembershipRole",
]
