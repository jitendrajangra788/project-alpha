from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.doctor import Doctor
from app.models.organization import Organization
from app.models.patient import Patient
from app.models.user import Role, User, UserRole
from app.core.enums import VerificationStatus
from app.schemas.admin import AdminDashboardOut, AdminUserOut, RoleDetailOut


async def dashboard_stats(db: AsyncSession) -> AdminDashboardOut:
    total_patients = (await db.execute(select(func.count()).select_from(Patient))).scalar_one()
    total_doctors = (await db.execute(select(func.count()).select_from(Doctor))).scalar_one()
    total_organizations = (await db.execute(select(func.count()).select_from(Organization))).scalar_one()
    pending = (
        await db.execute(
            select(func.count())
            .select_from(Organization)
            .where(
                Organization.verification_status.in_(
                    [VerificationStatus.PENDING.value, VerificationStatus.UNDER_REVIEW.value]
                )
            )
        )
    ).scalar_one()
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    return AdminDashboardOut(
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_organizations=total_organizations,
        pending_verifications=pending,
        total_users=total_users,
    )


async def list_users(db: AsyncSession, page: int = 1, page_size: int = 20) -> tuple[list[AdminUserOut], int]:
    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles).selectinload(UserRole.role))
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = result.scalars().unique().all()
    items = [
        AdminUserOut(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            mobile=u.mobile,
            is_active=u.is_active,
            roles=[ur.role.code for ur in u.roles if ur.role],
        )
        for u in users
    ]
    return items, total


async def list_roles(db: AsyncSession) -> list[RoleDetailOut]:
    result = await db.execute(select(Role).order_by(Role.code))
    roles = result.scalars().all()
    return [RoleDetailOut(id=r.id, code=r.code, name=r.name, description=r.description) for r in roles]
