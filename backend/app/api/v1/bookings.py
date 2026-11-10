from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.models.booking import Notification
from app.schemas.booking import (
    AvailabilityResponse,
    BookingCreate,
    BookingOut,
    BookingReschedule,
    BookingStatusUpdate,
    NotificationOut,
)
from app.services import bookings as booking_service

router = APIRouter()


@router.get("/availability/{listing_id}", response_model=AvailabilityResponse)
async def availability(listing_id: str, db: DbSession, day: date = Query(..., alias="date")):
    return await booking_service.get_availability(db, listing_id, day)


@router.post("", response_model=BookingOut)
async def create_booking(payload: BookingCreate, user: CurrentUser, db: DbSession):
    return await booking_service.create_booking(db, user, payload)


@router.get("/me", response_model=List[BookingOut])
async def my_bookings(user: CurrentUser, db: DbSession):
    return await booking_service.list_patient_bookings(db, user)


@router.get("/provider", response_model=List[BookingOut])
async def provider_bookings(user: CurrentUser, db: DbSession):
    return await booking_service.list_provider_bookings(db, user)


@router.get("/notifications/me", response_model=List[NotificationOut])
async def my_notifications(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50)
    )
    return list(result.scalars().all())


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: str, user: CurrentUser, db: DbSession):
    return await booking_service.get_booking(db, booking_id, user)


@router.post("/{booking_id}/status", response_model=BookingOut)
async def update_status(
    booking_id: str,
    payload: BookingStatusUpdate,
    user: CurrentUser,
    db: DbSession,
    as_provider: bool = Query(False),
):
    return await booking_service.update_booking_status(db, booking_id, user, payload, as_provider=as_provider)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(booking_id: str, user: CurrentUser, db: DbSession, reason: Optional[str] = None):
    return await booking_service.update_booking_status(
        db,
        booking_id,
        user,
        BookingStatusUpdate(status="CANCELLED", cancellation_reason=reason),
        as_provider=False,
    )


@router.post("/{booking_id}/reschedule", response_model=BookingOut)
async def reschedule(booking_id: str, payload: BookingReschedule, user: CurrentUser, db: DbSession):
    return await booking_service.reschedule_booking(db, booking_id, user, payload)
