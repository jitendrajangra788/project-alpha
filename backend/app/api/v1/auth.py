from fastapi import APIRouter, Request

from app.core.deps import DbSession
from app.schemas.auth import (
    AuthResponse,
    DoctorRegisterRequest,
    LoginRequest,
    OtpRequest,
    OtpVerifyRequest,
    PasswordForgotRequest,
    PasswordResetRequest,
    PatientRegisterRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.common import MessageOut
from app.services import auth as auth_service
from app.services.otp import otp_service

router = APIRouter()


@router.post("/register/patient", response_model=AuthResponse)
async def register_patient(payload: PatientRegisterRequest, db: DbSession):
    user, tokens = await auth_service.register_patient(db, payload)
    return AuthResponse(user=auth_service.user_to_out(user), tokens=TokenResponse(**tokens))


@router.post("/register/doctor", response_model=AuthResponse)
async def register_doctor(payload: DoctorRegisterRequest, db: DbSession):
    user, tokens = await auth_service.register_doctor(db, payload)
    return AuthResponse(user=auth_service.user_to_out(user), tokens=TokenResponse(**tokens))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: DbSession):
    user, tokens = await auth_service.login(db, payload.identifier, payload.password)
    return AuthResponse(user=auth_service.user_to_out(user), tokens=TokenResponse(**tokens))


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DbSession):
    tokens = await auth_service.refresh_tokens(db, payload.refresh_token)
    return TokenResponse(**tokens)


@router.post("/logout", response_model=MessageOut)
async def logout(payload: RefreshRequest, db: DbSession):
    await auth_service.logout(db, payload.refresh_token)
    return MessageOut(message="Logged out")


@router.post("/otp/request")
async def request_otp(payload: OtpRequest):
    return await otp_service.request_otp(payload.mobile, payload.purpose)


@router.post("/otp/verify", response_model=MessageOut)
async def verify_otp(payload: OtpVerifyRequest):
    await otp_service.verify_otp(payload.mobile, payload.otp, payload.purpose)
    return MessageOut(message="OTP verified")


@router.post("/password/forgot")
async def password_forgot(payload: PasswordForgotRequest):
    return await otp_service.request_otp(payload.mobile, "password_reset")


@router.post("/password/reset", response_model=MessageOut)
async def password_reset(payload: PasswordResetRequest, db: DbSession):
    await otp_service.verify_otp(payload.mobile, payload.otp, "password_reset")
    await auth_service.reset_password(db, payload.mobile, payload.new_password)
    return MessageOut(message="Password updated. You can sign in with your new password.")
