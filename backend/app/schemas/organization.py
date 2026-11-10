from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.enums import MembershipRole, OrganizationType, VerificationStatus


def _blank_to_none(value: object) -> object:
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    organization_type: OrganizationType
    contact_number: str
    email: Optional[EmailStr] = None
    address_line: str
    city: str
    state: Optional[str] = None
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    description: Optional[str] = None
    submit_for_verification: bool = True


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    description: Optional[str] = None


class OrganizationDocumentOut(BaseModel):
    id: str
    document_type: str
    file_name: str
    content_type: str

    model_config = {"from_attributes": True}


class OrganizationOut(BaseModel):
    id: str
    name: str
    organization_type: str
    contact_number: str
    email: Optional[str] = None
    address_line: str
    city: str
    state: Optional[str] = None
    pin_code: str
    license_number: Optional[str] = None
    description: Optional[str] = None
    verification_status: str
    is_verified: bool
    is_active: bool
    documents: List[OrganizationDocumentOut] = []

    model_config = {"from_attributes": True}


class VerificationAction(BaseModel):
    status: VerificationStatus
    notes: Optional[str] = None
    requested_documents: Optional[str] = None


class OrganizationMemberCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    mobile: str = Field(min_length=8, max_length=20)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    membership_role: MembershipRole = MembershipRole.STAFF
    # Optional doctor profile fields (used when membership_role=DOCTOR)
    specialty: Optional[str] = Field(default=None, max_length=120)
    qualification: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=120)
    registration_council: Optional[str] = Field(default=None, max_length=160)
    years_of_experience: Optional[int] = Field(default=None, ge=0, le=80)
    consultation_fee: Optional[float] = Field(default=None, ge=0)
    city: Optional[str] = Field(default=None, max_length=120)
    pin_code: Optional[str] = Field(default=None, max_length=12)
    about: Optional[str] = None

    @field_validator("email", "password", "specialty", "qualification", "city", "pin_code", "about", mode="before")
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        return _blank_to_none(value)

    @field_validator("mobile", mode="before")
    @classmethod
    def normalize_mobile(cls, value: object) -> str:
        raw = str(value or "").strip()
        digits = "".join(ch for ch in raw if ch.isdigit())
        if len(digits) < 10:
            raise ValueError("Mobile must have at least 10 digits")
        return digits[-10:] if len(digits) > 10 else digits


class OrganizationMemberUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    email: Optional[EmailStr] = None
    membership_role: Optional[MembershipRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    specialty: Optional[str] = Field(default=None, max_length=120)
    qualification: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=120)
    consultation_fee: Optional[float] = Field(default=None, ge=0)

    @field_validator("email", "password", "specialty", "qualification", mode="before")
    @classmethod
    def empty_str_to_none(cls, value: object) -> object:
        return _blank_to_none(value)


class OrganizationMemberOut(BaseModel):
    id: str
    organization_id: str
    user_id: str
    full_name: str
    mobile: str
    email: Optional[str] = None
    membership_role: str
    is_active: bool
    user_is_active: bool

    model_config = {"from_attributes": True}


class OrganizationLocationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    address_line: str = Field(min_length=3, max_length=500)
    city: str = Field(min_length=2, max_length=120)
    pin_code: str = Field(min_length=4, max_length=12)
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_primary: bool = False


class OrganizationLocationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    address_line: Optional[str] = Field(default=None, min_length=3, max_length=500)
    city: Optional[str] = Field(default=None, min_length=2, max_length=120)
    pin_code: Optional[str] = Field(default=None, min_length=4, max_length=12)
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_primary: Optional[bool] = None


class OrganizationLocationOut(BaseModel):
    id: str
    organization_id: str
    name: str
    address_line: str
    city: str
    pin_code: str
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_primary: bool

    model_config = {"from_attributes": True}
