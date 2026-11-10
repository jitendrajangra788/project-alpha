from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.platform import PlatformSetting
from app.schemas.platform import PlatformSettingsPublic, PlatformSettingsUpdate

DEFAULTS = {
    "brand_name": "CareConnect",
    "support_email": "support@careconnect.local",
    "support_phone": "+91 8000000000",
    "tagline": "Find the right healthcare, all in one place",
}


async def _get_map(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(PlatformSetting))
    rows = result.scalars().all()
    data = dict(DEFAULTS)
    data.update({r.key: r.value for r in rows})
    return data


async def get_public_settings(db: AsyncSession) -> PlatformSettingsPublic:
    data = await _get_map(db)
    return PlatformSettingsPublic(
        brand_name=data.get("brand_name", DEFAULTS["brand_name"]),
        support_email=data.get("support_email"),
        support_phone=data.get("support_phone"),
        tagline=data.get("tagline"),
    )


async def update_settings(db: AsyncSession, payload: PlatformSettingsUpdate) -> PlatformSettingsPublic:
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        if value is None:
            continue
        result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = value
        else:
            db.add(PlatformSetting(key=key, value=value))
    await db.commit()
    return await get_public_settings(db)
