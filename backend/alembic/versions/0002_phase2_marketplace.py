"""phase2 marketplace

Revision ID: 0002_phase2
Revises: 0001_phase1
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_phase2"
down_revision: Union[str, None] = "0001_phase1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(length=80), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_categories_code", "categories", ["code"])

    op.create_table(
        "specialties",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_specialties_code", "specialties", ["code"])

    op.create_table(
        "listings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("listing_type", sa.String(length=40), nullable=False),
        sa.Column("category_id", sa.String(length=36), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("organization_id", sa.String(length=36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("doctor_id", sa.String(length=36), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=280), nullable=False),
        sa.Column("tagline", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("specialty", sa.String(length=120), nullable=True),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("area", sa.String(length=120), nullable=True),
        sa.Column("pin_code", sa.String(length=12), nullable=False),
        sa.Column("address_line", sa.String(length=500), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("consultation_fee", sa.Float(), nullable=True),
        sa.Column("years_of_experience", sa.Integer(), nullable=True),
        sa.Column("rating_avg", sa.Float(), nullable=False, server_default="0"),
        sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("home_visit_available", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("online_consultation_available", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sample_collection_available", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("availability_summary", sa.String(length=255), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("slug", name="uq_listing_slug"),
    )
    op.create_index("ix_listings_listing_type", "listings", ["listing_type"])
    op.create_index("ix_listings_name", "listings", ["name"])
    op.create_index("ix_listings_slug", "listings", ["slug"])
    op.create_index("ix_listings_city", "listings", ["city"])
    op.create_index("ix_listings_pin_code", "listings", ["pin_code"])
    op.create_index("ix_listings_is_verified", "listings", ["is_verified"])
    op.create_index("ix_listings_is_featured", "listings", ["is_featured"])
    op.create_index("ix_listings_is_published", "listings", ["is_published"])
    op.create_index("ix_listings_organization_id", "listings", ["organization_id"])
    op.create_index("ix_listings_doctor_id", "listings", ["doctor_id"])
    op.create_index("ix_listings_specialty", "listings", ["specialty"])

    op.create_table(
        "listing_services",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("listing_id", sa.String(length=36), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("listing_services")
    op.drop_table("listings")
    op.drop_table("specialties")
    op.drop_table("categories")
