from typing import List, Optional

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int

    model_config = {"from_attributes": True}


class SpecialtyOut(BaseModel):
    id: str
    code: str
    name: str

    model_config = {"from_attributes": True}


class ListingServiceOut(BaseModel):
    id: str
    name: str
    price: Optional[float] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class ListingCardOut(BaseModel):
    id: str
    listing_type: str
    name: str
    slug: str
    tagline: Optional[str] = None
    specialty: Optional[str] = None
    city: str
    area: Optional[str] = None
    pin_code: str
    address_line: str
    phone: Optional[str] = None
    consultation_fee: Optional[float] = None
    years_of_experience: Optional[int] = None
    rating_avg: float
    rating_count: int
    is_verified: bool
    is_featured: bool
    home_visit_available: bool
    online_consultation_available: bool
    sample_collection_available: bool
    availability_summary: Optional[str] = None
    image_url: Optional[str] = None
    services: List[str] = []

    model_config = {"from_attributes": True}


class ListingDetailOut(ListingCardOut):
    description: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    service_items: List[ListingServiceOut] = []
    category: Optional[CategoryOut] = None


class SearchResponse(BaseModel):
    items: List[ListingCardOut]
    total: int
    page: int
    page_size: int
    query: Optional[str] = None


class HomeMarketplaceOut(BaseModel):
    categories: List[CategoryOut]
    top_doctors: List[ListingCardOut]
    popular_hospitals: List[ListingCardOut]
    verified_labs: List[ListingCardOut]
    home_care: List[ListingCardOut]
    featured: List[ListingCardOut]
    popular_searches: List[str]


class DoctorPublicOut(BaseModel):
    id: str
    full_name: str
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    registration_number: Optional[str] = None
    registration_council: Optional[str] = None
    years_of_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    online_consultation_fee: Optional[float] = None
    city: Optional[str] = None
    pin_code: Optional[str] = None
    about: Optional[str] = None
    languages: Optional[str] = None
    verification_status: str
    is_verified: bool
    listing: Optional[ListingDetailOut] = None


class OrganizationPublicOut(BaseModel):
    id: str
    name: str
    organization_type: str
    contact_number: str
    email: Optional[str] = None
    address_line: str
    city: str
    state: Optional[str] = None
    pin_code: str
    description: Optional[str] = None
    verification_status: str
    is_verified: bool
    listing: Optional[ListingDetailOut] = None
