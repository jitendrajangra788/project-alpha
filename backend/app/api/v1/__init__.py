from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    bookings,
    clinical,
    health,
    marketplace,
    organizations,
    payments,
    platform_settings,
    subscriptions,
    users,
    video,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(platform_settings.router, prefix="/platform-settings", tags=["platform-settings"])
api_router.include_router(marketplace.router, prefix="/marketplace", tags=["marketplace"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["clinical"])
api_router.include_router(video.router, prefix="/video", tags=["video"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])


