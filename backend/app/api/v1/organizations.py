from typing import List, Optional

from fastapi import APIRouter, File, Form, UploadFile

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationLocationCreate,
    OrganizationLocationOut,
    OrganizationLocationUpdate,
    OrganizationMemberCreate,
    OrganizationMemberOut,
    OrganizationMemberUpdate,
    OrganizationOut,
    OrganizationUpdate,
    VerificationAction,
)
from app.services import organizations as org_service

router = APIRouter()


@router.post("", response_model=OrganizationOut)
async def create_organization(payload: OrganizationCreate, user: CurrentUser, db: DbSession):
    org = await org_service.create_organization(db, user, payload)
    return org_service.org_to_out(org)


@router.get("/me", response_model=List[OrganizationOut])
async def my_organizations(user: CurrentUser, db: DbSession):
    orgs = await org_service.list_my_organizations(db, user.id)
    return [org_service.org_to_out(o) for o in orgs]


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(org_id: str, user: CurrentUser, db: DbSession):
    # Members only — prevents cross-tenant private data access
    org = await org_service.get_organization_for_user(db, org_id, user, admin=False)
    return org_service.org_to_out(org)


@router.patch("/{org_id}", response_model=OrganizationOut)
async def update_organization(org_id: str, payload: OrganizationUpdate, user: CurrentUser, db: DbSession):
    org = await org_service.update_organization(db, org_id, user, payload)
    return org_service.org_to_out(org)


@router.post("/{org_id}/submit-verification", response_model=OrganizationOut)
async def submit_verification(org_id: str, user: CurrentUser, db: DbSession):
    org = await org_service.submit_for_verification(db, org_id, user)
    return org_service.org_to_out(org)


@router.post("/{org_id}/documents", response_model=OrganizationOut)
async def upload_document(
    org_id: str,
    user: CurrentUser,
    db: DbSession,
    document_type: str = Form(...),
    file: UploadFile = File(...),
):
    org = await org_service.upload_document(db, org_id, user, document_type, file)
    return org_service.org_to_out(org)


@router.post("/{org_id}/verification", response_model=OrganizationOut)
async def admin_verification(org_id: str, payload: VerificationAction, admin: AdminUser, db: DbSession):
    org = await org_service.admin_verify(db, org_id, admin, payload)
    return org_service.org_to_out(org)


# ── Staff / members ──────────────────────────────────────────────


@router.get("/{org_id}/members", response_model=List[OrganizationMemberOut])
async def list_members(
    org_id: str,
    user: CurrentUser,
    db: DbSession,
    role: Optional[str] = None,
):
    members = await org_service.list_members(db, org_id, user)
    if role:
        members = [m for m in members if m.membership_role == role.upper()]
    return [org_service.member_to_out(m) for m in members]


@router.post("/{org_id}/members", response_model=OrganizationMemberOut)
async def add_member(org_id: str, payload: OrganizationMemberCreate, user: CurrentUser, db: DbSession):
    member = await org_service.add_member(db, org_id, user, payload)
    return org_service.member_to_out(member)


@router.patch("/{org_id}/members/{member_id}", response_model=OrganizationMemberOut)
async def update_member(
    org_id: str,
    member_id: str,
    payload: OrganizationMemberUpdate,
    user: CurrentUser,
    db: DbSession,
):
    member = await org_service.update_member(db, org_id, member_id, user, payload)
    return org_service.member_to_out(member)


@router.delete("/{org_id}/members/{member_id}", status_code=204)
async def remove_member(org_id: str, member_id: str, user: CurrentUser, db: DbSession):
    await org_service.remove_member(db, org_id, member_id, user)
    return None


# ── Branches / locations ─────────────────────────────────────────


@router.get("/{org_id}/locations", response_model=List[OrganizationLocationOut])
async def list_locations(org_id: str, user: CurrentUser, db: DbSession):
    locs = await org_service.list_locations(db, org_id, user)
    return [org_service.location_to_out(loc) for loc in locs]


@router.post("/{org_id}/locations", response_model=OrganizationLocationOut)
async def add_location(org_id: str, payload: OrganizationLocationCreate, user: CurrentUser, db: DbSession):
    loc = await org_service.add_location(db, org_id, user, payload)
    return org_service.location_to_out(loc)


@router.patch("/{org_id}/locations/{location_id}", response_model=OrganizationLocationOut)
async def update_location(
    org_id: str,
    location_id: str,
    payload: OrganizationLocationUpdate,
    user: CurrentUser,
    db: DbSession,
):
    loc = await org_service.update_location(db, org_id, location_id, user, payload)
    return org_service.location_to_out(loc)


@router.delete("/{org_id}/locations/{location_id}", status_code=204)
async def delete_location(org_id: str, location_id: str, user: CurrentUser, db: DbSession):
    await org_service.delete_location(db, org_id, location_id, user)
    return None
