"""Startup migrate + seed helpers for Vercel/Neon empty databases."""

from __future__ import annotations

import logging
from datetime import date
from pathlib import Path

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.enums import MembershipRole, OrganizationType, RoleCode, VerificationStatus
from app.core.security import hash_password
from app.models.organization import Organization, OrganizationMember, OrganizationVerification
from app.models.patient import Patient
from app.models.user import User
from app.services.auth import assign_role
from app.services.marketplace import upsert_listing_for_organization

logger = logging.getLogger(__name__)


def run_alembic_upgrade() -> None:
    from alembic import command
    from alembic.config import Config

    root = Path(__file__).resolve().parents[1]
    cfg = Config(str(root / "alembic.ini"))
    cfg.set_main_option("script_location", str(root / "alembic"))
    command.upgrade(cfg, "head")
    logger.info("Alembic upgrade head complete")


async def seed_three_entries(db) -> dict:
    """Create admin + patient + hospital (idempotent)."""
    created: list[str] = []

    async def ensure_user(full_name: str, email: str, mobile: str, password: str, roles: list[str]) -> User:
        user = (
            await db.execute(select(User).where((User.mobile == mobile) | (User.email == email)))
        ).scalar_one_or_none()
        if user:
            return user
        user = User(
            full_name=full_name,
            email=email,
            mobile=mobile,
            password_hash=hash_password(password),
            is_active=True,
            is_email_verified=True,
            is_mobile_verified=True,
        )
        db.add(user)
        await db.flush()
        for role in roles:
            await assign_role(db, user, role)
        created.append(email)
        return user

    await ensure_user(
        "CareConnect Admin",
        "admin@careconnect.local",
        "9999999999",
        "Admin@12345",
        [RoleCode.SUPER_ADMIN.value],
    )

    patient_user = await ensure_user(
        "Demo Patient Rohan",
        "patient@careconnect.local",
        "9800000001",
        "Demo@12345",
        [RoleCode.PATIENT.value],
    )
    has_patient = (await db.execute(select(Patient).where(Patient.user_id == patient_user.id))).scalar_one_or_none()
    if not has_patient:
        db.add(
            Patient(
                user_id=patient_user.id,
                date_of_birth=date(1995, 5, 12),
                gender="male",
                city="Lucknow",
                pin_code="226010",
                address_line="Demo Colony, Gomti Nagar",
            )
        )
        created.append("patient-profile")

    owner = await ensure_user(
        "Demo Hospital Owner",
        "hospital@careconnect.local",
        "9820000001",
        "Demo@12345",
        [RoleCode.HOSPITAL_OWNER.value],
    )
    org = (
        await db.execute(select(Organization).where(Organization.name == "CareConnect Demo Hospital"))
    ).scalar_one_or_none()
    if not org:
        org = Organization(
            name="CareConnect Demo Hospital",
            organization_type=OrganizationType.HOSPITAL.value,
            owner_user_id=owner.id,
            contact_number="9820000001",
            email="hospital@careconnect.local",
            address_line="1 Demo Hospital Road",
            city="Lucknow",
            state="Uttar Pradesh",
            pin_code="226001",
            description="Seeded demo hospital for CareConnect.",
            verification_status=VerificationStatus.VERIFIED.value,
            is_active=True,
        )
        db.add(org)
        await db.flush()
        db.add(
            OrganizationMember(
                organization_id=org.id,
                user_id=owner.id,
                membership_role=MembershipRole.OWNER.value,
                is_active=True,
            )
        )
        db.add(
            OrganizationVerification(
                organization_id=org.id,
                status=VerificationStatus.VERIFIED.value,
                notes="Auto-seeded verified demo",
            )
        )
        await upsert_listing_for_organization(db, org)
        created.append("CareConnect Demo Hospital")

    await db.commit()
    return {"created": created}


async def bootstrap_database(*, auto_migrate: bool, auto_seed_three: bool) -> None:
    if auto_migrate:
        try:
            run_alembic_upgrade()
        except Exception:
            logger.exception("Auto-migrate failed")
            raise

    # Always ensure roles/permissions exist after migrate (required for register/login)
    if auto_migrate or auto_seed_three:
        try:
            from app.seed import seed

            await seed()
            logger.info("Platform roles/settings seed complete")
        except Exception:
            logger.exception("Platform seed failed")
            raise

    if auto_seed_three:
        try:
            async with AsyncSessionLocal() as db:
                result = await seed_three_entries(db)
            logger.info("Auto seed three complete: %s", result)
        except Exception:
            logger.exception("Auto seed three failed")
            raise
