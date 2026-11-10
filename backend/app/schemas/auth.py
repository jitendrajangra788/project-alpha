from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class PatientRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)
    email: Optional[EmailStr] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None


class DoctorRegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)
    email: Optional[EmailStr] = None
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    registration_number: Optional[str] = None
    registration_council: Optional[str] = None
    years_of_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    city: Optional[str] = None
    pin_code: Optional[str] = None
    about: Optional[str] = None


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
