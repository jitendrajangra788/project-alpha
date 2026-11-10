from typing import List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    icon: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    listings: Mapped[List["Listing"]] = relationship(back_populates="category")


class Specialty(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "specialties"

    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Listing(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "listings"
    __table_args__ = (UniqueConstraint("slug", name="uq_listing_slug"),)

    listing_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    category_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("categories.id"), nullable=True)
    organization_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(280), nullable=False, index=True)
    tagline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    specialty: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    area: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    pin_code: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    address_line: Mapped[str] = mapped_column(String(500), nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    consultation_fee: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    home_visit_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    online_consultation_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sample_collection_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    availability_summary: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    category: Mapped[Optional["Category"]] = relationship(back_populates="listings")
    services: Mapped[List["ListingService"]] = relationship(back_populates="listing", cascade="all, delete-orphan")


class ListingService(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "listing_services"

    listing_id: Mapped[str] = mapped_column(String(36), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    listing: Mapped["Listing"] = relationship(back_populates="services")
