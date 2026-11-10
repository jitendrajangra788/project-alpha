from typing import Optional

from fastapi import APIRouter, Query

from app.core.deps import DbSession
from app.schemas.marketplace import (
    CategoryOut,
    DoctorPublicOut,
    HomeMarketplaceOut,
    ListingDetailOut,
    OrganizationPublicOut,
    SearchResponse,
    SpecialtyOut,
)
from app.services import marketplace as marketplace_service

router = APIRouter()


@router.get("/home", response_model=HomeMarketplaceOut)
async def marketplace_home(db: DbSession):
    return await marketplace_service.home_marketplace(db)


@router.get("/categories", response_model=list[CategoryOut])
async def categories(db: DbSession):
    return await marketplace_service.list_categories(db)


@router.get("/specialties", response_model=list[SpecialtyOut])
async def specialties(db: DbSession):
    return await marketplace_service.list_specialties(db)


@router.get("/search", response_model=SearchResponse)
async def search(
    db: DbSession,
    q: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    pin_code: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    listing_type: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    verified_only: bool = Query(False),
    home_visit: Optional[bool] = Query(None),
    online_consultation: Optional[bool] = Query(None),
    sample_collection: Optional[bool] = Query(None),
    min_fee: Optional[float] = Query(None),
    max_fee: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    featured_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
):
    return await marketplace_service.search_listings(
        db,
        q=q,
        city=city,
        pin_code=pin_code,
        category=category,
        listing_type=listing_type,
        specialty=specialty,
        verified_only=verified_only,
        home_visit=home_visit,
        online_consultation=online_consultation,
        sample_collection=sample_collection,
        min_fee=min_fee,
        max_fee=max_fee,
        min_rating=min_rating,
        featured_only=featured_only,
        page=page,
        page_size=page_size,
    )


@router.get("/listings/{slug}", response_model=ListingDetailOut)
async def listing_detail(slug: str, db: DbSession):
    return await marketplace_service.get_listing_by_slug(db, slug)


@router.get("/doctors/{doctor_id}", response_model=DoctorPublicOut)
async def public_doctor(doctor_id: str, db: DbSession):
    return await marketplace_service.get_public_doctor(db, doctor_id)


@router.get("/organizations/{org_id}", response_model=OrganizationPublicOut)
async def public_organization(org_id: str, db: DbSession):
    return await marketplace_service.get_public_organization(db, org_id)
