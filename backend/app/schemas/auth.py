from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


def _blank_to_none(value: object) -> object:
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _normalize_mobile(value: object) -> str:
    raw = str(value or "").strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) < 10:
        raise ValueError("Mobile must have at least 10 digits")
    # Prefer last 10 digits for Indian numbers with country code
    return digits[-10:] if len(digits) > 10 else digits


class PatientRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

    @field_validator("email", "gender", mode="before")
    @classmethod
    def empty_optional(cls, value: object) -> object:
        return _blank_to_none(value)

    @field_validator("mobile", mode="before")
    @classmethod
    def clean_mobile(cls, value: object) -> str:
        return _normalize_mobile(value)


class DoctorRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)
    email: Optional[EmailStr] = None
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    registration_number: Optional[str] = None
    registration_council: Optional[str] = None
    years_of_experience: Optional[int] = Field(default=None, ge=0, le=80)
    consultation_fee: Optional[float] = Field(default=None, ge=0)
    city: Optional[str] = None
    pin_code: Optional[str] = None
    about: Optional[str] = None

    @field_validator(
        "email",
        "specialty",
        "qualification",
        "registration_number",
        "registration_council",
        "city",
        "pin_code",
        "about",
        mode="before",
    )
    @classmethod
    def empty_optional(cls, value: object) -> object:
        return _blank_to_none(value)

    @field_validator("years_of_experience", "consultation_fee", mode="before")
    @classmethod
    def empty_number(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("mobile", mode="before")
    @classmethod
    def clean_mobile(cls, value: object) -> str:
        return _normalize_mobile(value)


class LoginRequest(BaseModel):
    identifier: str = Field(description="Email or mobile")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class OtpRequest(BaseModel):
    mobile: str
    purpose: str = "login"


class OtpVerifyRequest(BaseModel):
    mobile: str
    otp: str
    purpose: str = "login"


class PasswordForgotRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=15)


class PasswordResetRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=15)
    otp: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=8, max_length=128)


class RoleOut(BaseModel):
    code: str
    name: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    mobile: str
    is_active: bool
    roles: List[str] = []

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    tokens: TokenResponse
