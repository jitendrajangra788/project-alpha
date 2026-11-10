"""Seed roles, permissions, platform settings and super admin."""

import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.enums import RoleCode
from app.core.security import hash_password
from app.models.platform import PlatformSetting
from app.models.user import Permission, Role, RolePermission, User, UserRole
from app.services.platform import DEFAULTS

ROLE_DEFS = [
    (RoleCode.SUPER_ADMIN, "Super Admin", "Full platform control"),
    (RoleCode.ADMIN, "Admin", "Platform operations"),
    (RoleCode.PATIENT, "Patient", "Patient account"),
    (RoleCode.DOCTOR, "Doctor", "Independent or affiliated doctor"),
    (RoleCode.HOSPITAL_OWNER, "Hospital Owner", "Hospital organization owner"),
    (RoleCode.CLINIC_OWNER, "Clinic Owner", "Clinic organization owner"),
    (RoleCode.NURSING_HOME_OWNER, "Nursing Home Owner", "Nursing home owner"),
    (RoleCode.HOME_CARE_OWNER, "Home Care Owner", "Home-care agency owner"),
    (RoleCode.LAB_OWNER, "Lab Owner", "Laboratory owner"),
    (RoleCode.DIAGNOSTIC_CENTRE_OWNER, "Diagnostic Centre Owner", "Diagnostic centre owner"),
    (RoleCode.NURSE, "Nurse", "Nurse staff"),
    (RoleCode.CAREGIVER, "Caregiver", "Caregiver staff"),
    (RoleCode.LAB_TECHNICIAN, "Lab Technician", "Lab technician"),
    (RoleCode.RECEPTIONIST, "Receptionist", "Front desk staff"),
    (RoleCode.ORGANIZATION_MANAGER, "Organization Manager", "Organization manager"),
    (RoleCode.PHARMACY_OWNER, "Pharmacy Owner", "Future-ready pharmacy owner"),
]

PERMISSIONS = [
    ("admin.access", "Access admin panel"),
    ("org.manage", "Manage own organizations"),
    ("org.verify", "Verify organizations"),
    ("settings.manage", "Manage platform settings"),
    ("users.read", "Read users"),
]


async def seed() -> None:
    settings = get_settings()
    async with AsyncSessionLocal() as db:
        # Permissions
        perm_map: dict[str, Permission] = {}
        for code, name in PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.code == code))
            perm = result.scalar_one_or_none()
            if not perm:
                perm = Permission(code=code, name=name)
                db.add(perm)
                await db.flush()
            perm_map[code] = perm

        # Roles
        role_map: dict[str, Role] = {}
        for code, name, description in ROLE_DEFS:
            result = await db.execute(select(Role).where(Role.code == code.value))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(code=code.value, name=name, description=description)
                db.add(role)
                await db.flush()
            role_map[code.value] = role

        # Attach admin permissions
        admin_perm_codes = ["admin.access", "org.verify", "settings.manage", "users.read"]
        for role_code in (RoleCode.SUPER_ADMIN.value, RoleCode.ADMIN.value):
            role = role_map[role_code]
            for pcode in admin_perm_codes:
                existing = await db.execute(
                    select(RolePermission).where(
                        RolePermission.role_id == role.id, RolePermission.permission_id == perm_map[pcode].id
                    )
                )
                if not existing.scalar_one_or_none():
                    db.add(RolePermission(role_id=role.id, permission_id=perm_map[pcode].id))

        owner_role_codes = [
            RoleCode.HOSPITAL_OWNER.value,
            RoleCode.CLINIC_OWNER.value,
            RoleCode.NURSING_HOME_OWNER.value,
            RoleCode.HOME_CARE_OWNER.value,
            RoleCode.LAB_OWNER.value,
            RoleCode.DIAGNOSTIC_CENTRE_OWNER.value,
            RoleCode.ORGANIZATION_MANAGER.value,
        ]
        for role_code in owner_role_codes:
            role = role_map[role_code]
            existing = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm_map["org.manage"].id,
                )
            )
            if not existing.scalar_one_or_none():
                db.add(RolePermission(role_id=role.id, permission_id=perm_map["org.manage"].id))

        # Platform settings
        for key, value in DEFAULTS.items():
            result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))
            if not result.scalar_one_or_none():
                db.add(PlatformSetting(key=key, value=value, description=f"Default {key}"))

        # Super admin
        result = await db.execute(select(User).where(User.email == settings.seed_admin_email))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                full_name="CareConnect Super Admin",
                email=settings.seed_admin_email,
                mobile=settings.seed_admin_mobile,
                password_hash=hash_password(settings.seed_admin_password),
                is_active=True,
                is_email_verified=True,
                is_mobile_verified=True,
            )
            db.add(admin)
            await db.flush()
            db.add(UserRole(user_id=admin.id, role_id=role_map[RoleCode.SUPER_ADMIN.value].id))

        await db.commit()

        from app.services.payments import ensure_default_plans

        await ensure_default_plans(db)

        print("Seed completed.")
        print(f"Admin email: {settings.seed_admin_email}")
        print(f"Admin password: {settings.seed_admin_password}")


if __name__ == "__main__":
    asyncio.run(seed())
