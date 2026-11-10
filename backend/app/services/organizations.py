from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import (
    MEMBERSHIP_TO_USER_ROLE,
    ORG_ADMIN_MEMBERSHIP_ROLES,
    ORG_TYPE_TO_OWNER_ROLE,
    MembershipRole,
    VerificationStatus,
)
from app.core.security import hash_password
from app.models.doctor import Doctor
from app.models.organization import (
    Organization,
    OrganizationDocument,
    OrganizationLocation,
    OrganizationMember,
    OrganizationVerification,
)
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationDocumentOut,
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
from app.services.audit import write_audit
from app.services.auth import assign_role, find_user_by_identifier
from app.services.storage import storage_service


async def _ensure_doctor_profile(
    db: AsyncSession,
    *,
    user: User,
    org: Organization,
    specialty: Optional[str] = None,
    qualification: Optional[str] = None,
    registration_number: Optional[str] = None,
    registration_council: Optional[str] = None,
    years_of_experience: Optional[int] = None,
    consultation_fee: Optional[float] = None,
    city: Optional[str] = None,
    pin_code: Optional[str] = None,
    about: Optional[str] = None,
) -> Doctor:
    result = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        doctor = Doctor(
            user_id=user.id,
            specialty=specialty,
            qualification=qualification,
            registration_number=registration_number,
            registration_council=registration_council,
            years_of_experience=years_of_experience,
            consultation_fee=consultation_fee,
            city=city or org.city,
            pin_code=pin_code or org.pin_code,
            about=about,
            verification_status=VerificationStatus.PENDING.value,
            is_active=True,
        )
        db.add(doctor)
        await db.flush()
    else:
        if specialty is not None:
            doctor.specialty = specialty
        if qualification is not None:
            doctor.qualification = qualification
        if registration_number is not None:
            doctor.registration_number = registration_number
        if registration_council is not None:
            doctor.registration_council = registration_council
        if years_of_experience is not None:
            doctor.years_of_experience = years_of_experience
        if consultation_fee is not None:
            doctor.consultation_fee = consultation_fee
        if city is not None:
            doctor.city = city
        if pin_code is not None:
            doctor.pin_code = pin_code
        if about is not None:
            doctor.about = about
        if not doctor.city:
            doctor.city = org.city
        if not doctor.pin_code:
            doctor.pin_code = org.pin_code

    from app.services.marketplace import upsert_listing_for_doctor

    await upsert_listing_for_doctor(db, doctor, user)
    return doctor


def org_to_out(org: Organization) -> OrganizationOut:
    return OrganizationOut(
        id=org.id,
        name=org.name,
        organization_type=org.organization_type,
        contact_number=org.contact_number,
        email=org.email,
        address_line=org.address_line,
        city=org.city,
        state=org.state,
        pin_code=org.pin_code,
        license_number=org.license_number,
        description=org.description,
        verification_status=org.verification_status,
        is_verified=org.verification_status == VerificationStatus.VERIFIED.value,
        is_active=org.is_active,
        documents=[
            OrganizationDocumentOut(
                id=d.id,
                document_type=d.document_type,
                file_name=d.file_name,
                content_type=d.content_type,
            )
            for d in (org.documents or [])
        ],
    )


async def get_membership(db: AsyncSession, org_id: str, user_id: str) -> Optional[OrganizationMember]:
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def load_org(db: AsyncSession, org_id: str) -> Organization:
    result = await db.execute(
        select(Organization)
        .options(selectinload(Organization.documents), selectinload(Organization.verification))
        .where(Organization.id == org_id)
        .execution_options(populate_existing=True)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


async def create_organization(db: AsyncSession, user: User, payload: OrganizationCreate) -> Organization:
    status_value = (
        VerificationStatus.PENDING.value if payload.submit_for_verification else VerificationStatus.DRAFT.value
    )
    org = Organization(
        name=payload.name,
        organization_type=payload.organization_type.value,
        owner_user_id=user.id,
        contact_number=payload.contact_number,
        email=str(payload.email) if payload.email else None,
        address_line=payload.address_line,
        city=payload.city,
        state=payload.state,
        pin_code=payload.pin_code,
        latitude=payload.latitude,
        longitude=payload.longitude,
        license_number=payload.license_number,
        description=payload.description,
        verification_status=status_value,
    )
    db.add(org)
    await db.flush()

    db.add(
        OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            membership_role=MembershipRole.OWNER.value,
        )
    )
    db.add(
        OrganizationLocation(
            organization_id=org.id,
            name="Primary",
            address_line=payload.address_line,
            city=payload.city,
            pin_code=payload.pin_code,
            latitude=payload.latitude,
            longitude=payload.longitude,
            is_primary=True,
            phone=payload.contact_number,
        )
    )
    db.add(
        OrganizationVerification(
            organization_id=org.id,
            status=status_value,
        )
    )

    owner_role = ORG_TYPE_TO_OWNER_ROLE[payload.organization_type]
    await assign_role(db, user, owner_role.value)
    await write_audit(
        db,
        action="organization.create",
        resource_type="organization",
        resource_id=org.id,
        actor_user_id=user.id,
        details=f"type={payload.organization_type.value}",
    )
    from app.services.marketplace import upsert_listing_for_organization

    await upsert_listing_for_organization(db, org)
    await db.commit()
    return await load_org(db, org.id)


async def list_my_organizations(db: AsyncSession, user_id: str) -> List[Organization]:
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .options(selectinload(Organization.documents))
        .where(OrganizationMember.user_id == user_id, OrganizationMember.is_active.is_(True))
        .order_by(Organization.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def get_organization_for_user(db: AsyncSession, org_id: str, user: User, *, admin: bool = False) -> Organization:
    org = await load_org(db, org_id)
    if admin:
        return org
    membership = await get_membership(db, org_id, user.id)
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")
    return org


async def update_organization(
    db: AsyncSession, org_id: str, user: User, payload: OrganizationUpdate, *, admin: bool = False
) -> Organization:
    if admin:
        org = await get_organization_for_user(db, org_id, user, admin=True)
    else:
        await _require_org_admin(db, org_id, user)
        org = await load_org(db, org_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(org, key, value if key != "email" else (str(value) if value else None))
    await db.commit()
    return await load_org(db, org.id)


async def submit_for_verification(db: AsyncSession, org_id: str, user: User) -> Organization:
    org = await get_organization_for_user(db, org_id, user)
    if org.verification_status == VerificationStatus.VERIFIED.value:
        raise HTTPException(status_code=400, detail="Already verified")
    org.verification_status = VerificationStatus.PENDING.value
    if org.verification:
        org.verification.status = VerificationStatus.PENDING.value
        org.verification.notes = None
    await write_audit(
        db, action="organization.submit_verification", resource_type="organization", resource_id=org.id, actor_user_id=user.id
    )
    await db.commit()
    return await load_org(db, org.id)


async def upload_document(
    db: AsyncSession, org_id: str, user: User, document_type: str, file: UploadFile
) -> Organization:
    org = await get_organization_for_user(db, org_id, user)
    file_name, relative, content_type = await storage_service.save_upload(file, folder=f"orgs/{org_id}")
    db.add(
        OrganizationDocument(
            organization_id=org.id,
            document_type=document_type,
            file_name=file.filename or file_name,
            file_path=relative,
            content_type=content_type,
            uploaded_by=user.id,
        )
    )
    await write_audit(
        db,
        action="organization.document_upload",
        resource_type="organization",
        resource_id=org.id,
        actor_user_id=user.id,
        details=document_type,
    )
    await db.commit()
    return await load_org(db, org.id)


async def admin_list_verifications(db: AsyncSession, status_filter: Optional[str] = None) -> List[Organization]:
    q = select(Organization).options(selectinload(Organization.documents), selectinload(Organization.verification))
    if status_filter:
        q = q.where(Organization.verification_status == status_filter)
    else:
        q = q.where(
            Organization.verification_status.in_(
                [
                    VerificationStatus.PENDING.value,
                    VerificationStatus.UNDER_REVIEW.value,
                    VerificationStatus.REJECTED.value,
                ]
            )
        )
    q = q.order_by(Organization.updated_at.desc())
    result = await db.execute(q)
    return list(result.scalars().unique().all())


async def _require_org_admin(db: AsyncSession, org_id: str, user: User) -> OrganizationMember:
    membership = await get_membership(db, org_id, user.id)
    if not membership or membership.membership_role not in ORG_ADMIN_MEMBERSHIP_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization admin access required")
    return membership


def member_to_out(member: OrganizationMember) -> OrganizationMemberOut:
    user = member.user
    return OrganizationMemberOut(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        full_name=user.full_name if user else "",
        mobile=user.mobile if user else "",
        email=user.email if user else None,
        membership_role=member.membership_role,
        is_active=member.is_active,
        user_is_active=bool(user.is_active) if user else False,
    )


def location_to_out(loc: OrganizationLocation) -> OrganizationLocationOut:
    return OrganizationLocationOut(
        id=loc.id,
        organization_id=loc.organization_id,
        name=loc.name,
        address_line=loc.address_line,
        city=loc.city,
        pin_code=loc.pin_code,
        phone=loc.phone,
        latitude=loc.latitude,
        longitude=loc.longitude,
        is_primary=loc.is_primary,
    )


async def list_members(db: AsyncSession, org_id: str, user: User) -> List[OrganizationMember]:
    await get_organization_for_user(db, org_id, user)
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.organization_id == org_id)
        .order_by(OrganizationMember.created_at.desc())
    )
    return list(result.scalars().unique().all())


async def add_member(
    db: AsyncSession, org_id: str, actor: User, payload: OrganizationMemberCreate
) -> OrganizationMember:
    await _require_org_admin(db, org_id, actor)
    org = await get_organization_for_user(db, org_id, actor)
    if payload.membership_role == MembershipRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot assign OWNER via staff invite")

    existing_user = await find_user_by_identifier(db, payload.mobile)

    if not existing_user:
        if not payload.password:
            raise HTTPException(status_code=400, detail="Password required when creating a new staff account")
        if payload.email:
            email_hit = await find_user_by_identifier(db, str(payload.email))
            if email_hit:
                raise HTTPException(status_code=409, detail="Email already registered")
        existing_user = User(
            full_name=payload.full_name.strip(),
            mobile=payload.mobile,
            email=str(payload.email) if payload.email else None,
            password_hash=hash_password(payload.password),
            is_mobile_verified=False,
        )
        db.add(existing_user)
        await db.flush()
    else:
        existing_user.full_name = payload.full_name.strip()
        if payload.email:
            email_hit = await find_user_by_identifier(db, str(payload.email))
            if email_hit and email_hit.id != existing_user.id:
                raise HTTPException(status_code=409, detail="Email already registered")
            existing_user.email = str(payload.email)
        if payload.password:
            existing_user.password_hash = hash_password(payload.password)

    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == existing_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if member:
        if member.is_active:
            raise HTTPException(status_code=409, detail="User is already a member of this organization")
        member.is_active = True
        member.membership_role = payload.membership_role.value
    else:
        member = OrganizationMember(
            organization_id=org_id,
            user_id=existing_user.id,
            membership_role=payload.membership_role.value,
            is_active=True,
        )
        db.add(member)

    role_code = MEMBERSHIP_TO_USER_ROLE.get(payload.membership_role)
    if role_code:
        await assign_role(db, existing_user, role_code.value)

    if payload.membership_role == MembershipRole.DOCTOR:
        await _ensure_doctor_profile(
            db,
            user=existing_user,
            org=org,
            specialty=payload.specialty,
            qualification=payload.qualification,
            registration_number=payload.registration_number,
            registration_council=payload.registration_council,
            years_of_experience=payload.years_of_experience,
            consultation_fee=payload.consultation_fee,
            city=payload.city,
            pin_code=payload.pin_code,
            about=payload.about,
        )

    await write_audit(
        db,
        action="organization.member.add",
        resource_type="organization_member",
        resource_id=org_id,
        actor_user_id=actor.id,
        details=f"user={existing_user.id};role={payload.membership_role.value}",
    )
    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        msg = str(exc).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(status_code=409, detail="Mobile or email already registered") from exc
        raise HTTPException(status_code=400, detail="Could not add staff member") from exc

    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.organization_id == org_id, OrganizationMember.user_id == existing_user.id)
    )
    return result.scalar_one()


async def update_member(
    db: AsyncSession, org_id: str, member_id: str, actor: User, payload: OrganizationMemberUpdate
) -> OrganizationMember:
    await _require_org_admin(db, org_id, actor)
    org = await get_organization_for_user(db, org_id, actor)
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.id == member_id, OrganizationMember.organization_id == org_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")

    if member.membership_role == MembershipRole.OWNER.value and payload.membership_role and payload.membership_role != MembershipRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot change OWNER membership role")
    if payload.membership_role == MembershipRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot promote staff to OWNER here")

    data = payload.model_dump(exclude_unset=True)
    doctor_fields = {
        key: data.pop(key)
        for key in ("specialty", "qualification", "registration_number", "consultation_fee")
        if key in data
    }
    if "membership_role" in data and data["membership_role"] is not None:
        role = data.pop("membership_role")
        member.membership_role = role.value if isinstance(role, MembershipRole) else role
        mapped = MEMBERSHIP_TO_USER_ROLE.get(MembershipRole(member.membership_role))
        if mapped:
            await assign_role(db, member.user, mapped.value)
    if "is_active" in data and data["is_active"] is not None:
        if member.membership_role == MembershipRole.OWNER.value and data["is_active"] is False:
            raise HTTPException(status_code=400, detail="Cannot deactivate organization owner")
        member.is_active = data.pop("is_active")
    if member.user:
        if "full_name" in data and data["full_name"] is not None:
            member.user.full_name = data.pop("full_name")
        if "email" in data:
            email = data.pop("email")
            member.user.email = str(email) if email else None
        if "password" in data and data["password"]:
            member.user.password_hash = hash_password(data.pop("password"))

    if member.user and (member.membership_role == MembershipRole.DOCTOR.value or doctor_fields):
        await _ensure_doctor_profile(
            db,
            user=member.user,
            org=org,
            specialty=doctor_fields.get("specialty"),
            qualification=doctor_fields.get("qualification"),
            registration_number=doctor_fields.get("registration_number"),
            consultation_fee=doctor_fields.get("consultation_fee"),
        )

    await write_audit(
        db,
        action="organization.member.update",
        resource_type="organization_member",
        resource_id=member.id,
        actor_user_id=actor.id,
    )
    await db.commit()

    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.id == member_id)
    )
    return result.scalar_one()


async def remove_member(db: AsyncSession, org_id: str, member_id: str, actor: User) -> None:
    await _require_org_admin(db, org_id, actor)
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == org_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if member.membership_role == MembershipRole.OWNER.value:
        raise HTTPException(status_code=400, detail="Cannot remove organization owner")
    if member.user_id == actor.id:
        raise HTTPException(status_code=400, detail="Cannot remove your own membership")

    member.is_active = False
    await write_audit(
        db,
        action="organization.member.remove",
        resource_type="organization_member",
        resource_id=member.id,
        actor_user_id=actor.id,
    )
    await db.commit()


async def list_locations(db: AsyncSession, org_id: str, user: User) -> List[OrganizationLocation]:
    await get_organization_for_user(db, org_id, user)
    result = await db.execute(
        select(OrganizationLocation)
        .where(OrganizationLocation.organization_id == org_id)
        .order_by(OrganizationLocation.is_primary.desc(), OrganizationLocation.created_at.asc())
    )
    return list(result.scalars().all())


async def add_location(
    db: AsyncSession, org_id: str, actor: User, payload: OrganizationLocationCreate
) -> OrganizationLocation:
    await _require_org_admin(db, org_id, actor)
    if payload.is_primary:
        await _clear_primary_locations(db, org_id)
    loc = OrganizationLocation(
        organization_id=org_id,
        name=payload.name,
        address_line=payload.address_line,
        city=payload.city,
        pin_code=payload.pin_code,
        phone=payload.phone,
        latitude=payload.latitude,
        longitude=payload.longitude,
        is_primary=payload.is_primary,
    )
    db.add(loc)
    await write_audit(
        db,
        action="organization.location.add",
        resource_type="organization_location",
        resource_id=org_id,
        actor_user_id=actor.id,
        details=payload.name,
    )
    await db.commit()
    await db.refresh(loc)
    return loc


async def update_location(
    db: AsyncSession, org_id: str, location_id: str, actor: User, payload: OrganizationLocationUpdate
) -> OrganizationLocation:
    await _require_org_admin(db, org_id, actor)
    result = await db.execute(
        select(OrganizationLocation).where(
            OrganizationLocation.id == location_id,
            OrganizationLocation.organization_id == org_id,
        )
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Branch / location not found")
    data = payload.model_dump(exclude_unset=True)
    if data.get("is_primary"):
        await _clear_primary_locations(db, org_id)
    for key, value in data.items():
        setattr(loc, key, value)
    await write_audit(
        db,
        action="organization.location.update",
        resource_type="organization_location",
        resource_id=loc.id,
        actor_user_id=actor.id,
    )
    await db.commit()
    await db.refresh(loc)
    return loc


async def delete_location(db: AsyncSession, org_id: str, location_id: str, actor: User) -> None:
    await _require_org_admin(db, org_id, actor)
    result = await db.execute(
        select(OrganizationLocation).where(
            OrganizationLocation.id == location_id,
            OrganizationLocation.organization_id == org_id,
        )
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Branch / location not found")
    await db.delete(loc)
    await write_audit(
        db,
        action="organization.location.delete",
        resource_type="organization_location",
        resource_id=location_id,
        actor_user_id=actor.id,
    )
    await db.commit()


async def _clear_primary_locations(db: AsyncSession, org_id: str) -> None:
    result = await db.execute(
        select(OrganizationLocation).where(
            OrganizationLocation.organization_id == org_id,
            OrganizationLocation.is_primary.is_(True),
        )
    )
    for loc in result.scalars().all():
        loc.is_primary = False


async def admin_verify(db: AsyncSession, org_id: str, admin: User, action: VerificationAction) -> Organization:
    org = await load_org(db, org_id)
    allowed = {
        VerificationStatus.UNDER_REVIEW,
        VerificationStatus.VERIFIED,
        VerificationStatus.REJECTED,
        VerificationStatus.SUSPENDED,
        VerificationStatus.PENDING,
    }
    if action.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid verification transition")

    if action.status == VerificationStatus.VERIFIED and not org.documents:
        raise HTTPException(status_code=400, detail="Cannot verify without uploaded documents")

    org.verification_status = action.status.value
    if not org.verification:
        org.verification = OrganizationVerification(organization_id=org.id, status=action.status.value)
    org.verification.status = action.status.value
    org.verification.notes = action.notes
    org.verification.requested_documents = action.requested_documents
    org.verification.reviewed_by = admin.id
    org.verification.reviewed_at = datetime.now(timezone.utc)

    await write_audit(
        db,
        action=f"organization.verification.{action.status.value.lower()}",
        resource_type="organization",
        resource_id=org.id,
        actor_user_id=admin.id,
        details=action.notes,
    )
    from app.services.marketplace import upsert_listing_for_organization

    await upsert_listing_for_organization(db, org)
    await db.commit()
    return await load_org(db, org.id)
