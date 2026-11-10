import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketplace import Category, Listing
from app.services.marketplace import DEFAULT_CATEGORIES


@pytest.mark.asyncio
async def test_marketplace_home_and_search(client: AsyncClient, db_session: AsyncSession):
    for code, name, icon, sort_order in DEFAULT_CATEGORIES[:3]:
        db_session.add(Category(code=code, name=name, icon=icon, sort_order=sort_order))
    await db_session.flush()
    doctors = (await db_session.execute(select(Category).where(Category.code == "doctors"))).scalar_one()
    db_session.add(
        Listing(
            listing_type="DOCTOR",
            category_id=doctors.id,
            name="Demo Search Doctor",
            slug="demo-search-doctor",
            city="Lucknow",
            pin_code="226001",
            address_line="Demo Street",
            specialty="General Medicine",
            is_verified=False,
            is_published=True,
            consultation_fee=350,
        )
    )
    await db_session.commit()

    home = await client.get("/api/v1/marketplace/home")
    assert home.status_code == 200
    assert len(home.json()["categories"]) >= 3

    search = await client.get("/api/v1/marketplace/search", params={"q": "Demo", "city": "Lucknow"})
    assert search.status_code == 200
    body = search.json()
    assert body["total"] >= 1
    assert body["items"][0]["is_verified"] is False

    detail = await client.get("/api/v1/marketplace/listings/demo-search-doctor")
    assert detail.status_code == 200
    assert detail.json()["name"] == "Demo Search Doctor"
