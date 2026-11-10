from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import MembershipRole, OrganizationType, VerificationStatus


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


class OrganizationMemberUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    email: Optional[EmailStr] = None
    membership_role: Optional[MembershipRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


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
