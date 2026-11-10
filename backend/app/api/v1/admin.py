from typing import List, Optional

from fastapi import APIRouter, Query

from app.core.deps import AdminUser, DbSession
from app.schemas.admin import AdminDashboardOut, AdminUserOut, RoleDetailOut
from app.schemas.common import Paginated
from app.schemas.organization import OrganizationOut
from app.services import admin as admin_service
from app.services import organizations as org_service

router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboardOut)
async def dashboard(_: AdminUser, db: DbSession):
    return await admin_service.dashboard_stats(db)


@router.get("/users", response_model=Paginated[AdminUserOut])
async def users(
    _: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    items, total = await admin_service.list_users(db, page, page_size)
    return Paginated(items=items, total=total, page=page, page_size=page_size)


@router.get("/roles", response_model=List[RoleDetailOut])
async def roles(_: AdminUser, db: DbSession):
    return await admin_service.list_roles(db)


@router.get("/verifications", response_model=List[OrganizationOut])
async def verifications(
    _: AdminUser,
    db: DbSession,
    status: Optional[str] = Query(None),
):
    orgs = await org_service.admin_list_verifications(db, status)
    return [org_service.org_to_out(o) for o in orgs]
