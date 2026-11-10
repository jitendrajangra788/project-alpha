import hashlib
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import RoleCode
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    safe_decode_token,
    verify_password,
)
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import RefreshToken, Role, User, UserRole
from app.schemas.auth import DoctorRegisterRequest, PatientRegisterRequest, UserOut
from app.services.audit import write_audit


def user_to_out(user: User) -> UserOut:
    roles = [ur.role.code for ur in user.roles if ur.role]
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        mobile=user.mobile,
        is_active=user.is_active,
        roles=roles,
    )


async def get_role_by_code(db: AsyncSession, code: str) -> Role:
    result = await db.execute(select(Role).where(Role.code == code))
    role = result.scalar_one_or_none()
    if not role:
        # Self-heal empty Neon/Vercel DBs that migrated without seed
        role = Role(code=code, name=code.replace("_", " ").title(), description=f"Auto-created {code}")
        db.add(role)
        await db.flush()
    return role


async def assign_role(db: AsyncSession, user: User, role_code: str) -> None:
    role = await get_role_by_code(db, role_code)
    existing = await db.execute(
        select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
    )
    if existing.scalar_one_or_none():
        return
    db.add(UserRole(user_id=user.id, role_id=role.id))


async def load_user(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles).selectinload(UserRole.role))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def find_user_by_identifier(db: AsyncSession, identifier: str) -> Optional[User]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles).selectinload(UserRole.role))
        .where(or_(User.email == identifier, User.mobile == identifier))
    )
    return result.scalar_one_or_none()


async def ensure_unique_identity(db: AsyncSession, mobile: str, email: Optional[str]) -> None:
    q = select(User).where(User.mobile == mobile)
    if email:
        q = select(User).where(or_(User.mobile == mobile, User.email == email))
    existing = (await db.execute(q)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mobile or email already registered")


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def issue_tokens(db: AsyncSession, user: User, user_agent: Optional[str] = None, ip: Optional[str] = None) -> dict:
    roles = [ur.role.code for ur in user.roles if ur.role]
    access = create_access_token(user.id, {"roles": roles})
    refresh, jti, expires_at = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=jti,
            token_hash=hash_token(refresh),
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip,
        )
    )
    user.last_login_at = datetime.now(timezone.utc)
    return {"access_token": access, "refresh_token": refresh, "token_type": "bearer"}


async def register_patient(db: AsyncSession, payload: PatientRegisterRequest) -> tuple[User, dict]:
    await ensure_unique_identity(db, payload.mobile, payload.email)
    user = User(
        full_name=payload.full_name,
        mobile=payload.mobile,
        email=str(payload.email) if payload.email else None,
        password_hash=hash_password(payload.password),
        is_mobile_verified=False,
    )
    db.add(user)
    await db.flush()
    await assign_role(db, user, RoleCode.PATIENT.value)
    db.add(
        Patient(
            user_id=user.id,
            date_of_birth=payload.date_of_birth,
            gender=payload.gender,
        )
    )
    await write_audit(db, action="patient.register", resource_type="user", resource_id=user.id, actor_user_id=user.id)
    await db.commit()
    user = await load_user(db, user.id)
    assert user
    tokens = await issue_tokens(db, user)
    await db.commit()
    return user, tokens


async def register_doctor(db: AsyncSession, payload: DoctorRegisterRequest) -> tuple[User, dict]:
    await ensure_unique_identity(db, payload.mobile, payload.email)
    try:
        user = User(
            full_name=payload.full_name.strip(),
            mobile=payload.mobile,
            email=str(payload.email) if payload.email else None,
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        await db.flush()
        await assign_role(db, user, RoleCode.DOCTOR.value)
        doctor = Doctor(
            user_id=user.id,
            specialty=payload.specialty,
            qualification=payload.qualification,
            registration_number=payload.registration_number,
            registration_council=payload.registration_council,
            years_of_experience=payload.years_of_experience,
            consultation_fee=payload.consultation_fee,
            city=payload.city or "India",
            pin_code=payload.pin_code or "000000",
            about=payload.about,
        )
        db.add(doctor)
        await db.flush()
        from app.services.marketplace import upsert_listing_for_doctor

        await upsert_listing_for_doctor(db, doctor, user)
        await write_audit(db, action="doctor.register", resource_type="user", resource_id=user.id, actor_user_id=user.id)
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        msg = str(exc).lower()
        if "unique" in msg or "duplicate" in msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mobile or email already registered",
            ) from exc
        # Keep actionable detail for operators / UI (truncate noisy SQL)
        raw = str(exc).strip().replace("\n", " ")
        hint = raw[:180] if raw else "unknown error"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not complete doctor registration: {hint}",
        ) from exc

    user = await load_user(db, user.id)
    assert user
    tokens = await issue_tokens(db, user)
    await db.commit()
    return user, tokens


async def login(db: AsyncSession, identifier: str, password: str) -> tuple[User, dict]:
    user = await find_user_by_identifier(db, identifier)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    tokens = await issue_tokens(db, user)
    await db.commit()
    return user, tokens


async def reset_password(db: AsyncSession, mobile: str, new_password: str) -> None:
    user = await find_user_by_identifier(db, mobile)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found for this mobile")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    user.password_hash = hash_password(new_password)
    await write_audit(db, action="user.password_reset", resource_type="user", resource_id=user.id, actor_user_id=user.id)
    await db.commit()


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> dict:
    payload = safe_decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    jti = payload.get("jti")
    user_id = payload.get("sub")
    result = await db.execute(select(RefreshToken).where(RefreshToken.jti == jti, RefreshToken.user_id == user_id))
    stored = result.scalar_one_or_none()
    if not stored or stored.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")
    if stored.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    if stored.token_hash != hash_token(refresh_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    stored.revoked_at = datetime.now(timezone.utc)
    user = await load_user(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
    tokens = await issue_tokens(db, user)
    await db.commit()
    return tokens


async def logout(db: AsyncSession, refresh_token: str) -> None:
    payload = safe_decode_token(refresh_token)
    if not payload:
        return
    jti = payload.get("jti")
    result = await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
    stored = result.scalar_one_or_none()
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(timezone.utc)
        await db.commit()
