from fastapi import APIRouter

from app.core.deps import AdminUser, DbSession
from app.schemas.platform import PlatformSettingsPublic, PlatformSettingsUpdate
from app.services import platform as platform_service

router = APIRouter()


@router.get("", response_model=PlatformSettingsPublic)
async def get_settings(db: DbSession):
    return await platform_service.get_public_settings(db)


@router.patch("", response_model=PlatformSettingsPublic)
async def update_settings(payload: PlatformSettingsUpdate, _: AdminUser, db: DbSession):
    return await platform_service.update_settings(db, payload)
