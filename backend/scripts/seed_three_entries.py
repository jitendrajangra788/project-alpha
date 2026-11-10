"""Insert 3 starter CareConnect records into the connected Postgres DB.

1) Admin user
2) Demo patient
3) Demo hospital organization (+ owner)

Usage:
  $env:DATABASE_URL="postgres://…from Neon…"
  python scripts/seed_three_entries.py
"""

from __future__ import annotations

import asyncio
from datetime import date

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.enums import MembershipRole, OrganizationType, RoleCode, VerificationStatus
from app.core.security import hash_password
from app.models.organization import Organization, OrganizationMember, OrganizationVerification
from app.models.patient import Patient
from app.models.user import Role, User, UserRole
from app.services.auth import assign_role
from app.services.marketplace import upsert_listing_for_organization


ENTRIES = [
    {
        "kind": "admin",
        "full_name": "CareConnect Admin",
        "email": "admin@careconnect.local",
        "mobile": "9999999999",
        "password": "Admin@12345",
        "roles": [RoleCode.SUPER_ADMIN.value],
    },
    {
        "kind": "patient",
        "full_name": "Demo Patient Rohan",
        "email": "patient@careconnect.local",
        "mobile": "9800000001",
        "password": "Demo@12345",
        "roles": [RoleCode.PATIENT.value],
        "patient": {
            "date_of_birth": date(1995, 5, 12),
            "gender": "male",
            "city": "Lucknow",
            "pin_code": "226010",
            "address_line": "Demo Colony, Gomti Nagar",
        },
    },
    {
        "kind": "hospital",
        "full_name": "Demo Hospital Owner",
        "email": "hospital@careconnect.local",
        "mobile": "9820000001",
        "password": "Demo@12345",
        "roles": [RoleCode.HOSPITAL_OWNER.value],
        "org": {
            "name": "CareConnect Demo Hospital",
            "organization_type": OrganizationType.HOSPITAL.value,
            "contact_number": "9820000001",
            "email": "hospital@careconnect.local",
            "address_line": "1 Demo Hospital Road",
            "city": "Lucknow",
            "state": "Uttar Pradesh",
            "pin_code": "226001",
            "description": "Seeded demo hospital for CareConnect.",
        },
    },
]


async def _ensure_user(db, entry: dict) -> User:
    existing = (
        await db.execute(select(User).where((User.mobile == entry["mobile"]) | (User.email == entry["email"])))
    ).scalar_one_or_none()
    if existing:
        print(f"  · exists: {entry['email']}")
        return existing

    user = User(
        full_name=entry["full_name"],
        email=entry["email"],
        mobile=entry["mobile"],
        password_hash=hash_password(entry["password"]),
        is_active=True,
        is_email_verified=True,
        is_mobile_verified=True,
    )
    db.add(user)
    await db.flush()
    for role in entry["roles"]:
        await assign_role(db, user, role)
    print(f"  + user: {entry['email']} / {entry['mobile']}  pwd={entry['password']}")
    return user


async def main() -> None:
    # Ensure roles exist (seed baseline first if empty)
    async with AsyncSessionLocal() as db:
        role_count = (await db.execute(select(Role))).scalars().first()
        if not role_count:
            print("Roles missing — run: python -m app.seed")
            raise SystemExit(1)

    print("Seeding 3 entries…")
    async with AsyncSessionLocal() as db:
        for entry in ENTRIES:
            user = await _ensure_user(db, entry)

            if entry["kind"] == "patient" and entry.get("patient"):
                has_patient = (
                    await db.execute(select(Patient).where(Patient.user_id == user.id))
                ).scalar_one_or_none()
                if not has_patient:
                    db.add(Patient(user_id=user.id, **entry["patient"]))
                    print("  + patient profile")

            if entry["kind"] == "hospital" and entry.get("org"):
                org_data = entry["org"]
                org = (
                    await db.execute(select(Organization).where(Organization.name == org_data["name"]))
                ).scalar_one_or_none()
                if not org:
                    org = Organization(
                        owner_user_id=user.id,
                        verification_status=VerificationStatus.VERIFIED.value,
                        is_active=True,
                        **org_data,
                    )
                    db.add(org)
                    await db.flush()
                    db.add(
                        OrganizationMember(
                            organization_id=org.id,
                            user_id=user.id,
                            membership_role=MembershipRole.OWNER.value,
                            is_active=True,
                        )
                    )
                    db.add(
                        OrganizationVerification(
                            organization_id=org.id,
                            status=VerificationStatus.VERIFIED.value,
                            notes="Seeded verified for demo",
                        )
                    )
                    await upsert_listing_for_organization(db, org)
                    print(f"  + hospital org: {org.name}")
                else:
                    print(f"  · org exists: {org.name}")

        await db.commit()
    print("Done. 3 entries ready.")


if __name__ == "__main__":
    asyncio.run(main())
