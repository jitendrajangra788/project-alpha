"""Seed demo users, orgs, doctors and wire marketplace listings. Dev only."""

from __future__ import annotations

import asyncio
from datetime import date

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.enums import MembershipRole, RoleCode, VerificationStatus
from app.core.security import hash_password
from app.models.doctor import Doctor
from app.models.marketplace import Listing
from app.models.organization import Organization, OrganizationMember, OrganizationVerification
from app.models.patient import Patient
from app.models.user import Role, User, UserRole
from app.services.payments import ensure_default_plans

# Shared demo password for every seeded account (clearly labeled demo).
DEMO_PASSWORD = "Demo@12345"

DEMO_USERS = [
    {
        "key": "admin",
        "full_name": "CareConnect Super Admin",
        "email": "admin@careconnect.local",
        "mobile": "9999999999",
        "password": "Admin@12345",
        "roles": [RoleCode.SUPER_ADMIN.value],
        "note": "Platform admin",
    },
    {
        "key": "patient",
        "full_name": "Demo Patient Rohan",
        "email": "patient@careconnect.local",
        "mobile": "9800000001",
        "roles": [RoleCode.PATIENT.value],
        "patient": {
            "date_of_birth": date(1995, 5, 12),
            "gender": "male",
            "city": "Lucknow",
            "pin_code": "226010",
            "address_line": "Demo Colony, Gomti Nagar",
        },
        "note": "Patient login",
    },
    {
        "key": "patient2",
        "full_name": "Demo Patient Neha",
        "email": "patient2@careconnect.local",
        "mobile": "9800000002",
        "roles": [RoleCode.PATIENT.value],
        "patient": {
            "date_of_birth": date(1992, 8, 21),
            "gender": "female",
            "city": "Lucknow",
            "pin_code": "226001",
            "address_line": "Demo Street, Hazratganj",
        },
        "note": "Second patient",
    },
    {
        "key": "doctor",
        "full_name": "Demo Dr. Ananya Sharma",
        "email": "doctor@careconnect.local",
        "mobile": "9810000001",
        "roles": [RoleCode.DOCTOR.value],
        "doctor": {
            "specialty": "General Medicine",
            "qualification": "MBBS, MD",
            "registration_number": "DEMO-DOC-001",
            "years_of_experience": 8,
            "consultation_fee": 400,
            "online_consultation_fee": 350,
            "city": "Lucknow",
            "pin_code": "226010",
            "clinic_address": "Demo Clinic, Gomti Nagar",
            "about": "Demo doctor account for CareConnect development.",
            "verification_status": VerificationStatus.VERIFIED.value,
            "listing_name": "Demo Dr. Ananya Sharma",
        },
        "note": "Doctor dashboard + bookings",
    },
    {
        "key": "doctor2",
        "full_name": "Demo Dr. Kabir Mehra",
        "email": "doctor2@careconnect.local",
        "mobile": "9810000002",
        "roles": [RoleCode.DOCTOR.value],
        "doctor": {
            "specialty": "Paediatrics",
            "qualification": "MBBS, DCH",
            "registration_number": "DEMO-DOC-002",
            "years_of_experience": 12,
            "consultation_fee": 500,
            "online_consultation_fee": 450,
            "city": "Lucknow",
            "pin_code": "226001",
            "clinic_address": "Demo Child Care, Hazratganj",
            "about": "Demo paediatrician account.",
            "verification_status": VerificationStatus.VERIFIED.value,
            "listing_name": "Demo Dr. Kabir Mehra",
        },
        "note": "Second doctor",
    },
    {
        "key": "hospital",
        "full_name": "Demo Hospital Owner",
        "email": "hospital@careconnect.local",
        "mobile": "9820000001",
        "roles": [RoleCode.HOSPITAL_OWNER.value],
        "org": {
            "name": "Demo City Care Hospital",
            "organization_type": "HOSPITAL",
            "contact_number": "9000000001",
            "address_line": "Sector F, Aliganj, Lucknow",
            "city": "Lucknow",
            "pin_code": "226024",
            "listing_name": "Demo City Care Hospital",
        },
        "note": "Hospital owner / provider",
    },
    {
        "key": "clinic",
        "full_name": "Demo Clinic Owner",
        "email": "clinic@careconnect.local",
        "mobile": "9820000002",
        "roles": [RoleCode.CLINIC_OWNER.value],
        "org": {
            "name": "Demo Family Clinic",
            "organization_type": "CLINIC",
            "contact_number": "9000000002",
            "address_line": "Demo Road, Lucknow",
            "city": "Lucknow",
            "pin_code": "226003",
            "listing_name": "Demo Family Clinic",
        },
        "note": "Clinic owner",
    },
    {
        "key": "lab",
        "full_name": "Demo Lab Owner",
        "email": "lab@careconnect.local",
        "mobile": "9820000003",
        "roles": [RoleCode.LAB_OWNER.value],
        "org": {
            "name": "Demo Path Labs",
            "organization_type": "LAB",
            "contact_number": "9000000003",
            "address_line": "Hazratganj Lab Centre",
            "city": "Lucknow",
            "pin_code": "226001",
            "listing_name": "Demo Path Labs",
        },
        "note": "Lab owner / lab dashboard",
    },
    {
        "key": "homecare",
        "full_name": "Demo Home Care Owner",
        "email": "homecare@careconnect.local",
        "mobile": "9820000004",
        "roles": [RoleCode.HOME_CARE_OWNER.value],
        "org": {
            "name": "Demo Comfort Home Care",
            "organization_type": "HOME_CARE",
            "contact_number": "9000000004",
            "address_line": "Gomti Nagar Extension",
            "city": "Lucknow",
            "pin_code": "226010",
            "listing_name": "Demo Comfort Home Care",
        },
        "note": "Home-care agency owner",
    },
    {
        "key": "nursing",
        "full_name": "Demo Nursing Home Owner",
        "email": "nursing@careconnect.local",
        "mobile": "9820000005",
        "roles": [RoleCode.NURSING_HOME_OWNER.value],
        "org": {
            "name": "Demo Serene Nursing Home",
            "organization_type": "NURSING_HOME",
            "contact_number": "9000000005",
            "address_line": "Indira Nagar",
            "city": "Lucknow",
            "pin_code": "226016",
            "listing_name": "Demo Serene Nursing Home",
        },
        "note": "Nursing home owner",
    },
]


async def _role_map(db) -> dict[str, Role]:
    rows = (await db.execute(select(Role))).scalars().all()
    return {r.code: r for r in rows}


async def _upsert_user(db, item: dict, roles: dict[str, Role]) -> User:
    email = item["email"]
    password = item.get("password", DEMO_PASSWORD)
    user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if not user:
        user = User(
            full_name=item["full_name"],
            email=email,
            mobile=item["mobile"],
            password_hash=hash_password(password),
            is_active=True,
            is_email_verified=True,
            is_mobile_verified=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.full_name = item["full_name"]
        user.mobile = item["mobile"]
        user.password_hash = hash_password(password)
        user.is_active = True

    for role_code in item["roles"]:
        role = roles.get(role_code)
        if not role:
            continue
        existing = (
            await db.execute(
                select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(UserRole(user_id=user.id, role_id=role.id))
    return user


async def seed_demo_users() -> list[dict]:
    credentials: list[dict] = []
    async with AsyncSessionLocal() as db:
        roles = await _role_map(db)
        if not roles:
            raise RuntimeError("Roles missing. Run: python -m app.seed")

        await ensure_default_plans(db)

        for item in DEMO_USERS:
            password = item.get("password", DEMO_PASSWORD)
            user = await _upsert_user(db, item, roles)

            if "patient" in item:
                patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
                if not patient:
                    db.add(Patient(user_id=user.id, **item["patient"]))
                else:
                    for k, v in item["patient"].items():
                        setattr(patient, k, v)

            if "doctor" in item:
                dcfg = dict(item["doctor"])
                listing_name = dcfg.pop("listing_name", None)
                doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
                if not doctor:
                    doctor = Doctor(user_id=user.id, **dcfg)
                    db.add(doctor)
                    await db.flush()
                else:
                    for k, v in dcfg.items():
                        setattr(doctor, k, v)
                if listing_name:
                    listing = (
                        await db.execute(select(Listing).where(Listing.name == listing_name))
                    ).scalar_one_or_none()
                    if listing:
                        listing.doctor_id = doctor.id
                        listing.is_verified = doctor.verification_status == VerificationStatus.VERIFIED.value

            if "org" in item:
                ocfg = dict(item["org"])
                listing_name = ocfg.pop("listing_name", None)
                org = (
                    await db.execute(select(Organization).where(Organization.name == ocfg["name"]))
                ).scalar_one_or_none()
                if not org:
                    org = Organization(
                        owner_user_id=user.id,
                        email=user.email,
                        verification_status=VerificationStatus.VERIFIED.value,
                        is_active=True,
                        **ocfg,
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
                            notes="Demo seed — auto verified for local testing only.",
                        )
                    )
                else:
                    org.owner_user_id = user.id
                    org.verification_status = VerificationStatus.VERIFIED.value
                    org.is_active = True
                    membership = (
                        await db.execute(
                            select(OrganizationMember).where(
                                OrganizationMember.organization_id == org.id,
                                OrganizationMember.user_id == user.id,
                            )
                        )
                    ).scalar_one_or_none()
                    if not membership:
                        db.add(
                            OrganizationMember(
                                organization_id=org.id,
                                user_id=user.id,
                                membership_role=MembershipRole.OWNER.value,
                                is_active=True,
                            )
                        )
                if listing_name:
                    listing = (
                        await db.execute(select(Listing).where(Listing.name == listing_name))
                    ).scalar_one_or_none()
                    if listing:
                        listing.organization_id = org.id
                        listing.is_verified = True

            credentials.append(
                {
                    "role": item["note"],
                    "email": item["email"],
                    "mobile": item["mobile"],
                    "password": password,
                    "login_hint": item["email"],
                }
            )

        await db.commit()
    return credentials


def print_credentials(credentials: list[dict]) -> None:
    print("\n=== CareConnect DEMO LOGINS ===")
    print(f"{'Role':<28} {'Email / Identifier':<32} {'Password'}")
    print("-" * 78)
    for row in credentials:
        print(f"{row['role']:<28} {row['email']:<32} {row['password']}")
    print("-" * 78)
    print("Login page: http://localhost:4200/login")
    print("Identifier field accepts email OR mobile.")
    print("Demo listings are labeled Demo*; verified badges only for seeded VERIFIED accounts.\n")


async def main() -> None:
    creds = await seed_demo_users()
    print_credentials(creds)


if __name__ == "__main__":
    asyncio.run(main())
