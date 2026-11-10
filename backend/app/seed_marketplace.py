"""Seed marketplace categories, specialties and clearly labeled DEMO listings."""

import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.enums import ListingType
from app.models.marketplace import Category, Listing, ListingService, Specialty
from app.services.marketplace import DEFAULT_CATEGORIES, DEFAULT_SPECIALTIES, unique_slug


DEMO_LISTINGS = [
    {
        "listing_type": ListingType.DOCTOR.value,
        "category": "doctors",
        "name": "Demo Dr. Ananya Sharma",
        "specialty": "General Medicine",
        "city": "Lucknow",
        "area": "Gomti Nagar",
        "pin_code": "226010",
        "address_line": "Demo Clinic, Gomti Nagar, Lucknow",
        "consultation_fee": 400,
        "years_of_experience": 8,
        "online_consultation_available": True,
        "tagline": "General physician · Demo profile",
        "description": "Development demo doctor profile. Not a real clinician.",
        "services": [("General consultation", 400), ("Follow-up", 250)],
        "featured": True,
    },
    {
        "listing_type": ListingType.DOCTOR.value,
        "category": "doctors",
        "name": "Demo Dr. Kabir Mehra",
        "specialty": "Paediatrics",
        "city": "Lucknow",
        "area": "Hazratganj",
        "pin_code": "226001",
        "address_line": "Demo Child Care, Hazratganj",
        "consultation_fee": 500,
        "years_of_experience": 12,
        "online_consultation_available": True,
        "tagline": "Paediatrician · Demo profile",
        "description": "Development demo paediatrician listing.",
        "services": [("Child consultation", 500)],
        "featured": False,
    },
    {
        "listing_type": ListingType.HOSPITAL.value,
        "category": "hospitals",
        "name": "Demo City Care Hospital",
        "city": "Lucknow",
        "area": "Aliganj",
        "pin_code": "226024",
        "address_line": "Sector F, Aliganj, Lucknow",
        "phone": "9000000001",
        "tagline": "Multi-specialty hospital · Demo",
        "description": "Demo hospital listing for marketplace UI.",
        "services": [("OPD", None), ("Emergency", None)],
        "featured": True,
    },
    {
        "listing_type": ListingType.CLINIC.value,
        "category": "clinics",
        "name": "Demo Family Clinic",
        "city": "Lucknow",
        "pin_code": "226003",
        "address_line": "Demo Road, Lucknow",
        "tagline": "Neighborhood clinic · Demo",
        "description": "Demo clinic listing.",
        "services": [("Consultation", 300)],
        "featured": False,
    },
    {
        "listing_type": ListingType.HOME_CARE.value,
        "category": "home-care",
        "name": "Demo Comfort Home Care",
        "city": "Lucknow",
        "pin_code": "226010",
        "address_line": "Gomti Nagar Extension",
        "home_visit_available": True,
        "tagline": "Home nursing · Demo agency",
        "description": "Demo home-care agency. Staff credentials must be verified before real assignments.",
        "services": [("12-hour attendant", 1200), ("Nursing visit", 800)],
        "featured": True,
    },
    {
        "listing_type": ListingType.LAB.value,
        "category": "labs",
        "name": "Demo Path Labs",
        "city": "Lucknow",
        "pin_code": "226001",
        "address_line": "Hazratganj Lab Centre",
        "sample_collection_available": True,
        "tagline": "Pathology · Demo lab",
        "description": "Demo laboratory listing. Reports and accreditation are not real.",
        "services": [("CBC", 299), ("Thyroid profile", 499), ("Full body checkup", 1499)],
        "featured": True,
    },
    {
        "listing_type": ListingType.NURSING_HOME.value,
        "category": "nursing-homes",
        "name": "Demo Serene Nursing Home",
        "city": "Lucknow",
        "pin_code": "226016",
        "address_line": "Indira Nagar",
        "tagline": "Nursing home · Demo",
        "description": "Demo nursing home listing.",
        "services": [("In-patient care", None)],
        "featured": False,
    },
]


async def seed_marketplace() -> None:
    async with AsyncSessionLocal() as db:
        cat_map: dict[str, Category] = {}
        for code, name, icon, sort_order in DEFAULT_CATEGORIES:
            row = (await db.execute(select(Category).where(Category.code == code))).scalar_one_or_none()
            if not row:
                row = Category(code=code, name=name, icon=icon, sort_order=sort_order, description=f"{name} directory")
                db.add(row)
                await db.flush()
            cat_map[code] = row

        for code, name in DEFAULT_SPECIALTIES:
            existing = (await db.execute(select(Specialty).where(Specialty.code == code))).scalar_one_or_none()
            if not existing:
                db.add(Specialty(code=code, name=name))

        for item in DEMO_LISTINGS:
            existing = (await db.execute(select(Listing).where(Listing.name == item["name"]))).scalar_one_or_none()
            if existing:
                continue
            category = cat_map[item["category"]]
            listing = Listing(
                listing_type=item["listing_type"],
                category_id=category.id,
                name=item["name"],
                slug=await unique_slug(db, item["name"]),
                tagline=item.get("tagline"),
                description=item.get("description"),
                specialty=item.get("specialty"),
                city=item["city"],
                area=item.get("area"),
                pin_code=item["pin_code"],
                address_line=item["address_line"],
                phone=item.get("phone"),
                consultation_fee=item.get("consultation_fee"),
                years_of_experience=item.get("years_of_experience"),
                rating_avg=0,
                rating_count=0,
                is_verified=False,  # never fake-verified
                is_featured=item.get("featured", False),
                is_published=True,
                home_visit_available=item.get("home_visit_available", False),
                online_consultation_available=item.get("online_consultation_available", False),
                sample_collection_available=item.get("sample_collection_available", False),
                availability_summary="Demo availability",
            )
            db.add(listing)
            await db.flush()
            for service_name, price in item.get("services", []):
                db.add(ListingService(listing_id=listing.id, name=service_name, price=price))

        await db.commit()
        print("Marketplace seed completed (demo listings are unlabeled as verified).")


if __name__ == "__main__":
    asyncio.run(seed_marketplace())
