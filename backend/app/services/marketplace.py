import re
from typing import List, Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.enums import ORG_TYPE_TO_LISTING_TYPE, ListingType, OrganizationType, VerificationStatus
from app.models.doctor import Doctor
from app.models.marketplace import Category, Listing, ListingService, Specialty
from app.models.organization import Organization
from app.models.user import User
from app.schemas.marketplace import (
    CategoryOut,
    DoctorPublicOut,
    HomeMarketplaceOut,
    ListingCardOut,
    ListingDetailOut,
    ListingServiceOut,
    OrganizationPublicOut,
    SearchResponse,
    SpecialtyOut,
)


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:240] or "listing"


def listing_to_card(listing: Listing) -> ListingCardOut:
    return ListingCardOut(
        id=listing.id,
        listing_type=listing.listing_type,
        name=listing.name,
        slug=listing.slug,
        tagline=listing.tagline,
        specialty=listing.specialty,
        city=listing.city,
        area=listing.area,
        pin_code=listing.pin_code,
        address_line=listing.address_line,
        phone=listing.phone,
        consultation_fee=listing.consultation_fee,
        years_of_experience=listing.years_of_experience,
        rating_avg=listing.rating_avg,
        rating_count=listing.rating_count,
        is_verified=listing.is_verified,
        is_featured=listing.is_featured,
        home_visit_available=listing.home_visit_available,
        online_consultation_available=listing.online_consultation_available,
        sample_collection_available=listing.sample_collection_available,
        availability_summary=listing.availability_summary,
        image_url=listing.image_url,
        services=[s.name for s in (listing.services or [])[:5]],
    )


def listing_to_detail(listing: Listing) -> ListingDetailOut:
    card = listing_to_card(listing)
    return ListingDetailOut(
        **card.model_dump(exclude={"services"}),
        services=card.services,
        description=listing.description,
        email=listing.email,
        latitude=listing.latitude,
        longitude=listing.longitude,
        organization_id=listing.organization_id,
        doctor_id=listing.doctor_id,
        service_items=[ListingServiceOut.model_validate(s) for s in (listing.services or [])],
        category=CategoryOut.model_validate(listing.category) if listing.category else None,
    )


async def unique_slug(db: AsyncSession, base: str, exclude_id: Optional[str] = None) -> str:
    slug = slugify(base)
    candidate = slug
    i = 2
    while True:
        q = select(Listing).where(Listing.slug == candidate)
        if exclude_id:
            q = q.where(Listing.id != exclude_id)
        existing = (await db.execute(q)).scalar_one_or_none()
        if not existing:
            return candidate
        candidate = f"{slug}-{i}"
        i += 1


async def get_category_by_code(db: AsyncSession, code: str) -> Optional[Category]:
    result = await db.execute(select(Category).where(Category.code == code))
    return result.scalar_one_or_none()


async def ensure_category(db: AsyncSession, code: str, name: Optional[str] = None) -> Category:
    category = await get_category_by_code(db, code)
    if category:
        return category
    category = Category(
        code=code,
        name=name or code.replace("-", " ").title(),
        description=f"Auto-created {code}",
        sort_order=0,
        is_active=True,
    )
    db.add(category)
    await db.flush()
    return category


async def upsert_listing_for_organization(db: AsyncSession, org: Organization) -> Listing:
    listing_type = ORG_TYPE_TO_LISTING_TYPE.get(OrganizationType(org.organization_type), ListingType.CLINIC)
    category_code = {
        ListingType.HOSPITAL: "hospitals",
        ListingType.CLINIC: "clinics",
        ListingType.NURSING_HOME: "nursing-homes",
        ListingType.HOME_CARE: "home-care",
        ListingType.LAB: "labs",
        ListingType.DIAGNOSTIC_CENTRE: "diagnostic-centres",
    }.get(listing_type, "clinics")
    category = await get_category_by_code(db, category_code)

    result = await db.execute(select(Listing).where(Listing.organization_id == org.id))
    listing = result.scalar_one_or_none()
    is_verified = org.verification_status == VerificationStatus.VERIFIED.value
    payload = {
        "listing_type": listing_type.value,
        "category_id": category.id if category else None,
        "name": org.name,
        "description": org.description,
        "city": org.city,
        "pin_code": org.pin_code,
        "address_line": org.address_line,
        "latitude": org.latitude,
        "longitude": org.longitude,
        "phone": org.contact_number,
        "email": org.email,
        "is_verified": is_verified,
        "is_published": org.is_active and org.verification_status not in {VerificationStatus.SUSPENDED.value},
        "home_visit_available": org.organization_type == OrganizationType.HOME_CARE.value,
        "sample_collection_available": org.organization_type
        in {OrganizationType.LAB.value, OrganizationType.DIAGNOSTIC_CENTRE.value},
        "availability_summary": "Open today · Call to confirm slots",
    }
    if listing:
        for key, value in payload.items():
            setattr(listing, key, value)
        listing.slug = await unique_slug(db, f"{org.name}-{org.city}", exclude_id=listing.id)
    else:
        listing = Listing(
            organization_id=org.id,
            slug=await unique_slug(db, f"{org.name}-{org.city}"),
            **payload,
        )
        db.add(listing)
    await db.flush()
    return listing


async def upsert_listing_for_doctor(db: AsyncSession, doctor: Doctor, user: User) -> Listing:
    category = await ensure_category(db, "doctors", "Doctors")
    result = await db.execute(select(Listing).where(Listing.doctor_id == doctor.id))
    listing = result.scalar_one_or_none()
    is_verified = doctor.verification_status == VerificationStatus.VERIFIED.value
    city = doctor.city or "India"
    pin = doctor.pin_code or "000000"
    address = doctor.clinic_address or f"{city}, {pin}"
    payload = {
        "listing_type": ListingType.DOCTOR.value,
        "category_id": category.id,
        "name": user.full_name,
        "description": doctor.about,
        "specialty": doctor.specialty,
        "city": city,
        "pin_code": pin,
        "address_line": address,
        "phone": user.mobile,
        "email": user.email,
        "consultation_fee": doctor.consultation_fee,
        "years_of_experience": doctor.years_of_experience,
        "is_verified": is_verified,
        "is_published": doctor.is_active,
        "online_consultation_available": doctor.online_consultation_fee is not None,
        "availability_summary": "Available for booking",
        "tagline": doctor.specialty,
    }
    if listing:
        for key, value in payload.items():
            setattr(listing, key, value)
        listing.slug = await unique_slug(db, f"dr-{user.full_name}-{city}", exclude_id=listing.id)
    else:
        listing = Listing(
            doctor_id=doctor.id,
            slug=await unique_slug(db, f"dr-{user.full_name}-{city}"),
            **payload,
        )
        db.add(listing)
    await db.flush()
    return listing


async def list_categories(db: AsyncSession) -> List[CategoryOut]:
    result = await db.execute(
        select(Category).where(Category.is_active.is_(True)).order_by(Category.sort_order, Category.name)
    )
    return [CategoryOut.model_validate(c) for c in result.scalars().all()]


async def list_specialties(db: AsyncSession) -> List[SpecialtyOut]:
    result = await db.execute(select(Specialty).where(Specialty.is_active.is_(True)).order_by(Specialty.name))
    return [SpecialtyOut.model_validate(s) for s in result.scalars().all()]


async def _load_listings(db: AsyncSession, stmt) -> List[Listing]:
    result = await db.execute(stmt.options(selectinload(Listing.services), selectinload(Listing.category)))
    return list(result.scalars().unique().all())


async def search_listings(
    db: AsyncSession,
    *,
    q: Optional[str] = None,
    city: Optional[str] = None,
    pin_code: Optional[str] = None,
    category: Optional[str] = None,
    listing_type: Optional[str] = None,
    specialty: Optional[str] = None,
    verified_only: bool = False,
    home_visit: Optional[bool] = None,
    online_consultation: Optional[bool] = None,
    sample_collection: Optional[bool] = None,
    min_fee: Optional[float] = None,
    max_fee: Optional[float] = None,
    min_rating: Optional[float] = None,
    featured_only: bool = False,
    page: int = 1,
    page_size: int = 12,
) -> SearchResponse:
    filters = [Listing.is_published.is_(True)]
    if q:
        like = f"%{q.strip()}%"
        filters.append(
            or_(
                Listing.name.ilike(like),
                Listing.specialty.ilike(like),
                Listing.city.ilike(like),
                Listing.area.ilike(like),
                Listing.description.ilike(like),
                Listing.tagline.ilike(like),
            )
        )
    if city:
        filters.append(Listing.city.ilike(f"%{city.strip()}%"))
    if pin_code:
        filters.append(Listing.pin_code == pin_code.strip())
    if listing_type:
        filters.append(Listing.listing_type == listing_type.upper())
    if specialty:
        filters.append(Listing.specialty.ilike(f"%{specialty.strip()}%"))
    if verified_only:
        filters.append(Listing.is_verified.is_(True))
    if featured_only:
        filters.append(Listing.is_featured.is_(True))
    if home_visit is not None:
        filters.append(Listing.home_visit_available.is_(home_visit))
    if online_consultation is not None:
        filters.append(Listing.online_consultation_available.is_(online_consultation))
    if sample_collection is not None:
        filters.append(Listing.sample_collection_available.is_(sample_collection))
    if min_fee is not None:
        filters.append(Listing.consultation_fee >= min_fee)
    if max_fee is not None:
        filters.append(Listing.consultation_fee <= max_fee)
    if min_rating is not None:
        filters.append(Listing.rating_avg >= min_rating)

    stmt = select(Listing).where(*filters)
    if category:
        stmt = stmt.join(Category, Category.id == Listing.category_id).where(Category.code == category)

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        stmt.options(selectinload(Listing.services), selectinload(Listing.category))
        .order_by(Listing.is_featured.desc(), Listing.is_verified.desc(), Listing.rating_avg.desc(), Listing.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list((await db.execute(stmt)).scalars().unique().all())
    return SearchResponse(
        items=[listing_to_card(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        query=q,
    )


async def get_listing_by_slug(db: AsyncSession, slug: str) -> ListingDetailOut:
    result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.services), selectinload(Listing.category))
        .where(Listing.slug == slug, Listing.is_published.is_(True))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing_to_detail(listing)


async def home_marketplace(db: AsyncSession) -> HomeMarketplaceOut:
    categories = await list_categories(db)

    async def fetch(listing_type: str, *, verified: bool = False, limit: int = 6) -> List[ListingCardOut]:
        filters = [Listing.is_published.is_(True), Listing.listing_type == listing_type]
        if verified:
            filters.append(Listing.is_verified.is_(True))
        stmt = (
            select(Listing)
            .where(*filters)
            .options(selectinload(Listing.services))
            .order_by(Listing.is_featured.desc(), Listing.rating_avg.desc(), Listing.created_at.desc())
            .limit(limit)
        )
        rows = list((await db.execute(stmt)).scalars().unique().all())
        return [listing_to_card(r) for r in rows]

    featured_stmt = (
        select(Listing)
        .where(Listing.is_published.is_(True), Listing.is_featured.is_(True))
        .options(selectinload(Listing.services))
        .order_by(Listing.rating_avg.desc())
        .limit(8)
    )
    featured = [listing_to_card(r) for r in (await db.execute(featured_stmt)).scalars().unique().all()]

    return HomeMarketplaceOut(
        categories=categories,
        top_doctors=await fetch(ListingType.DOCTOR.value),
        popular_hospitals=await fetch(ListingType.HOSPITAL.value),
        verified_labs=await fetch(ListingType.LAB.value, verified=True)
        + await fetch(ListingType.DIAGNOSTIC_CENTRE.value, verified=True, limit=3),
        home_care=await fetch(ListingType.HOME_CARE.value),
        featured=featured,
        popular_searches=[
            "General Physician",
            "Pediatrician",
            "Full Body Checkup",
            "Home Nursing",
            "Dental Clinic",
            "Pathology Lab",
        ],
    )


async def get_public_doctor(db: AsyncSession, doctor_id: str) -> DoctorPublicOut:
    result = await db.execute(
        select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == doctor_id, Doctor.is_active.is_(True))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    listing_result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.services), selectinload(Listing.category))
        .where(Listing.doctor_id == doctor.id, Listing.is_published.is_(True))
    )
    listing = listing_result.scalar_one_or_none()
    return DoctorPublicOut(
        id=doctor.id,
        full_name=doctor.user.full_name if doctor.user else "Doctor",
        specialty=doctor.specialty,
        qualification=doctor.qualification,
        registration_number=doctor.registration_number,
        registration_council=doctor.registration_council,
        years_of_experience=doctor.years_of_experience,
        consultation_fee=doctor.consultation_fee,
        online_consultation_fee=doctor.online_consultation_fee,
        city=doctor.city,
        pin_code=doctor.pin_code,
        about=doctor.about,
        languages=doctor.languages,
        verification_status=doctor.verification_status,
        is_verified=doctor.verification_status == VerificationStatus.VERIFIED.value,
        listing=listing_to_detail(listing) if listing else None,
    )


async def get_public_organization(db: AsyncSession, org_id: str) -> OrganizationPublicOut:
    result = await db.execute(select(Organization).where(Organization.id == org_id, Organization.is_active.is_(True)))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    listing_result = await db.execute(
        select(Listing)
        .options(selectinload(Listing.services), selectinload(Listing.category))
        .where(Listing.organization_id == org.id, Listing.is_published.is_(True))
    )
    listing = listing_result.scalar_one_or_none()
    return OrganizationPublicOut(
        id=org.id,
        name=org.name,
        organization_type=org.organization_type,
        contact_number=org.contact_number,
        email=org.email,
        address_line=org.address_line,
        city=org.city,
        state=org.state,
        pin_code=org.pin_code,
        description=org.description,
        verification_status=org.verification_status,
        is_verified=org.verification_status == VerificationStatus.VERIFIED.value,
        listing=listing_to_detail(listing) if listing else None,
    )


DEFAULT_CATEGORIES: Sequence[tuple[str, str, str, int]] = (
    ("doctors", "Doctors", "local_hospital", 1),
    ("hospitals", "Hospitals", "apartment", 2),
    ("clinics", "Clinics", "medical_services", 3),
    ("nursing-homes", "Nursing Homes", "home_health", 4),
    ("home-care", "Home Care", "elderly", 5),
    ("labs", "Diagnostic Labs", "biotech", 6),
    ("diagnostic-centres", "Diagnostic Centres", "monitor_heart", 7),
    ("blood-tests", "Blood Tests", "bloodtype", 8),
    ("health-packages", "Health Packages", "inventory", 9),
    ("physiotherapy", "Physiotherapy", "accessibility", 10),
    ("ambulance", "Ambulance", "emergency", 11),
)

DEFAULT_SPECIALTIES = (
    ("general-medicine", "General Medicine"),
    ("paediatrics", "Paediatrics"),
    ("gynaecology", "Gynaecology"),
    ("dermatology", "Dermatology"),
    ("orthopaedics", "Orthopaedics"),
    ("diabetology", "Diabetology"),
    ("cardiology", "Cardiology"),
    ("ent", "ENT"),
)
