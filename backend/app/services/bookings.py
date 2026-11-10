from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import BookingStatus, BookingType, PaymentStatus, SlotStatus
from app.models.booking import AppointmentSlot, Booking, BookingStatusHistory
from app.models.marketplace import Listing
from app.models.organization import OrganizationMember
from app.models.patient import Patient
from app.models.user import User
from app.schemas.booking import (
    AvailabilityResponse,
    BookingCreate,
    BookingOut,
    BookingReschedule,
    BookingStatusUpdate,
    SlotOut,
)
from app.services.audit import write_audit
from app.services.notifications import notify_user

ACTIVE_SLOT_STATUSES = {BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value, BookingStatus.ASSIGNED.value, BookingStatus.IN_PROGRESS.value}
PROVIDER_TRANSITIONS = {
    BookingStatus.PENDING.value: {BookingStatus.CONFIRMED.value, BookingStatus.REJECTED.value, BookingStatus.CANCELLED.value},
    BookingStatus.CONFIRMED.value: {
        BookingStatus.ASSIGNED.value,
        BookingStatus.IN_PROGRESS.value,
        BookingStatus.COMPLETED.value,
        BookingStatus.CANCELLED.value,
    },
    BookingStatus.ASSIGNED.value: {BookingStatus.IN_PROGRESS.value, BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value},
    BookingStatus.IN_PROGRESS.value: {BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value},
}
PATIENT_CANCEL_FROM = {BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value}


def _booking_number() -> str:
    return f"CC{datetime.now(timezone.utc).strftime('%y%m%d')}{uuid4().hex[:8].upper()}"


async def get_patient_for_user(db: AsyncSession, user: User) -> Patient:
    result = await db.execute(select(Patient).where(Patient.user_id == user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile required. Register as a patient first.")
    return patient


async def load_listing(db: AsyncSession, listing_id: str) -> Listing:
    result = await db.execute(select(Listing).where(Listing.id == listing_id, Listing.is_published.is_(True)))
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


def booking_to_out(booking: Booking, listing_name: Optional[str] = None) -> BookingOut:
    return BookingOut(
        id=booking.id,
        booking_number=booking.booking_number,
        booking_type=booking.booking_type,
        status=booking.status,
        payment_status=booking.payment_status,
        listing_id=booking.listing_id,
        listing_name=listing_name,
        organization_id=booking.organization_id,
        doctor_id=booking.doctor_id,
        patient_id=booking.patient_id,
        scheduled_date=booking.scheduled_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        service_name=booking.service_name,
        amount=booking.amount,
        currency=booking.currency,
        patient_notes=booking.patient_notes,
        provider_notes=booking.provider_notes,
        is_home_service=booking.is_home_service,
        is_online=booking.is_online,
        address_line=booking.address_line,
        city=booking.city,
        pin_code=booking.pin_code,
        created_at=booking.created_at,
        confirmed_at=booking.confirmed_at,
        cancelled_at=booking.cancelled_at,
        completed_at=booking.completed_at,
    )


async def ensure_slots_for_date(db: AsyncSession, listing: Listing, day: date) -> List[AppointmentSlot]:
    """Generate default daytime slots if none exist for the listing/date."""
    result = await db.execute(
        select(AppointmentSlot).where(AppointmentSlot.listing_id == listing.id, AppointmentSlot.slot_date == day)
    )
    existing = list(result.scalars().all())
    if existing:
        return existing

    # Mon-Sat style hours 09:00-17:00, 30-min slots; skip past times for today
    generated: List[AppointmentSlot] = []
    start = datetime.combine(day, time(9, 0))
    end_day = datetime.combine(day, time(17, 0))
    now = datetime.now()
    while start < end_day:
        slot_end = start + timedelta(minutes=30)
        if day > date.today() or start >= now:
            slot = AppointmentSlot(
                listing_id=listing.id,
                organization_id=listing.organization_id,
                doctor_id=listing.doctor_id,
                slot_date=day,
                start_time=start.time().replace(microsecond=0),
                end_time=slot_end.time().replace(microsecond=0),
                status=SlotStatus.OPEN.value,
            )
            db.add(slot)
            generated.append(slot)
        start = slot_end
    await db.flush()
    return generated or existing


async def get_availability(db: AsyncSession, listing_id: str, day: date) -> AvailabilityResponse:
    if day < date.today():
        raise HTTPException(status_code=400, detail="Cannot fetch availability for past dates")
    listing = await load_listing(db, listing_id)
    slots = await ensure_slots_for_date(db, listing, day)
    await db.commit()
    result = await db.execute(
        select(AppointmentSlot)
        .where(AppointmentSlot.listing_id == listing_id, AppointmentSlot.slot_date == day)
        .order_by(AppointmentSlot.start_time)
    )
    rows = list(result.scalars().all())
    out = []
    for s in rows:
        remaining = max(s.capacity - s.booked_count, 0)
        status_value = s.status
        if remaining <= 0:
            status_value = SlotStatus.BOOKED.value
        out.append(
            SlotOut(
                id=s.id,
                listing_id=s.listing_id,
                slot_date=s.slot_date,
                start_time=s.start_time,
                end_time=s.end_time,
                status=status_value,
                capacity=s.capacity,
                booked_count=s.booked_count,
                remaining=remaining,
            )
        )
    return AvailabilityResponse(listing_id=listing_id, date=day, slots=out)


async def _lock_and_book_slot(db: AsyncSession, slot_id: str) -> AppointmentSlot:
    result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == slot_id).with_for_update())
    slot = result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.status == SlotStatus.BLOCKED.value:
        raise HTTPException(status_code=409, detail="Slot is blocked")
    if slot.booked_count >= slot.capacity:
        raise HTTPException(status_code=409, detail="Slot already fully booked")
    slot.booked_count += 1
    if slot.booked_count >= slot.capacity:
        slot.status = SlotStatus.BOOKED.value
    return slot


async def _release_slot(db: AsyncSession, slot_id: Optional[str]) -> None:
    if not slot_id:
        return
    result = await db.execute(select(AppointmentSlot).where(AppointmentSlot.id == slot_id).with_for_update())
    slot = result.scalar_one_or_none()
    if not slot:
        return
    slot.booked_count = max(slot.booked_count - 1, 0)
    if slot.booked_count < slot.capacity and slot.status == SlotStatus.BOOKED.value:
        slot.status = SlotStatus.OPEN.value


async def create_booking(db: AsyncSession, user: User, payload: BookingCreate) -> BookingOut:
    patient = await get_patient_for_user(db, user)
    listing = await load_listing(db, payload.listing_id)

    slot: Optional[AppointmentSlot] = None
    if payload.slot_id:
        slot = await _lock_and_book_slot(db, payload.slot_id)
        if slot.listing_id != listing.id:
            raise HTTPException(status_code=400, detail="Slot does not belong to this listing")
        scheduled_date, start_time, end_time = slot.slot_date, slot.start_time, slot.end_time
    else:
        # Create/find matching open slot then lock
        await ensure_slots_for_date(db, listing, payload.scheduled_date)
        result = await db.execute(
            select(AppointmentSlot).where(
                AppointmentSlot.listing_id == listing.id,
                AppointmentSlot.slot_date == payload.scheduled_date,
                AppointmentSlot.start_time == payload.start_time,
            )
        )
        found = result.scalar_one_or_none()
        if not found:
            found = AppointmentSlot(
                listing_id=listing.id,
                organization_id=listing.organization_id,
                doctor_id=listing.doctor_id,
                slot_date=payload.scheduled_date,
                start_time=payload.start_time,
                end_time=payload.end_time,
                status=SlotStatus.OPEN.value,
            )
            db.add(found)
            await db.flush()
        slot = await _lock_and_book_slot(db, found.id)
        scheduled_date, start_time, end_time = slot.slot_date, slot.start_time, slot.end_time

    booking_type = payload.booking_type or listing.listing_type
    if payload.is_online:
        booking_type = BookingType.VIDEO_CONSULTATION.value
    elif payload.is_home_service and listing.listing_type == "LAB":
        booking_type = BookingType.SAMPLE_COLLECTION.value

    booking = Booking(
        booking_number=_booking_number(),
        booking_type=booking_type,
        status=BookingStatus.PENDING.value,
        payment_status=PaymentStatus.UNPAID.value,
        patient_id=patient.id,
        patient_user_id=user.id,
        listing_id=listing.id,
        organization_id=listing.organization_id,
        doctor_id=listing.doctor_id,
        slot_id=slot.id if slot else None,
        scheduled_date=scheduled_date,
        start_time=start_time,
        end_time=end_time,
        service_name=payload.service_name or listing.specialty or listing.name,
        amount=listing.consultation_fee,
        patient_notes=payload.patient_notes,
        is_home_service=payload.is_home_service,
        is_online=payload.is_online,
        address_line=payload.address_line or (listing.address_line if not payload.is_home_service else None),
        city=payload.city or listing.city,
        pin_code=payload.pin_code or listing.pin_code,
    )
    db.add(booking)
    await db.flush()
    db.add(
        BookingStatusHistory(
            booking_id=booking.id,
            from_status=None,
            to_status=BookingStatus.PENDING.value,
            changed_by=user.id,
            note="Booking created",
        )
    )
    await notify_user(
        db,
        user_id=user.id,
        event_type="booking.created",
        title="Booking received",
        body=f"Your booking {booking.booking_number} is pending confirmation.",
        payload={"booking_id": booking.id},
    )
    await write_audit(
        db,
        action="booking.create",
        resource_type="booking",
        resource_id=booking.id,
        actor_user_id=user.id,
    )
    await db.commit()
    await db.refresh(booking)
    return booking_to_out(booking, listing_name=listing.name)


async def list_patient_bookings(db: AsyncSession, user: User) -> List[BookingOut]:
    patient = await get_patient_for_user(db, user)
    result = await db.execute(
        select(Booking).where(Booking.patient_id == patient.id).order_by(Booking.scheduled_date.desc(), Booking.start_time.desc())
    )
    bookings = list(result.scalars().all())
    return await _with_listing_names(db, bookings)


async def _with_listing_names(db: AsyncSession, bookings: List[Booking]) -> List[BookingOut]:
    listing_ids = {b.listing_id for b in bookings if b.listing_id}
    names: dict[str, str] = {}
    if listing_ids:
        rows = (await db.execute(select(Listing).where(Listing.id.in_(listing_ids)))).scalars().all()
        names = {r.id: r.name for r in rows}
    return [booking_to_out(b, listing_name=names.get(b.listing_id or "")) for b in bookings]


async def user_can_manage_listing(db: AsyncSession, user: User, listing: Listing) -> bool:
    roles = {ur.role.code for ur in user.roles if ur.role}
    if roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        return True
    if listing.organization_id:
        membership = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == listing.organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active.is_(True),
            )
        )
        if membership.scalar_one_or_none():
            return True
    if listing.doctor_id:
        from app.models.doctor import Doctor

        doctor = (await db.execute(select(Doctor).where(Doctor.id == listing.doctor_id))).scalar_one_or_none()
        if doctor and doctor.user_id == user.id:
            return True
    return False


async def list_provider_bookings(db: AsyncSession, user: User) -> List[BookingOut]:
    # Bookings for orgs the user belongs to, or doctor profile owned by user
    from app.models.doctor import Doctor

    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
    memberships = (
        await db.execute(
            select(OrganizationMember.organization_id).where(
                OrganizationMember.user_id == user.id, OrganizationMember.is_active.is_(True)
            )
        )
    ).scalars().all()

    filters = []
    if doctor:
        filters.append(Booking.doctor_id == doctor.id)
    if memberships:
        filters.append(Booking.organization_id.in_(list(memberships)))
    if not filters:
        return []

    result = await db.execute(
        select(Booking).where(or_(*filters)).order_by(Booking.scheduled_date.desc(), Booking.start_time.desc())
    )
    return await _with_listing_names(db, list(result.scalars().all()))


async def get_booking(db: AsyncSession, booking_id: str, user: User) -> BookingOut:
    booking = await _load_booking(db, booking_id)
    await _authorize_booking_access(db, booking, user)
    listing_name = None
    if booking.listing_id:
        listing = (await db.execute(select(Listing).where(Listing.id == booking.listing_id))).scalar_one_or_none()
        listing_name = listing.name if listing else None
    return booking_to_out(booking, listing_name=listing_name)


async def _load_booking(db: AsyncSession, booking_id: str) -> Booking:
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


async def _authorize_booking_access(db: AsyncSession, booking: Booking, user: User) -> None:
    if booking.patient_user_id == user.id:
        return
    if booking.listing_id:
        listing = (
            await db.execute(select(Listing).where(Listing.id == booking.listing_id))
        ).scalar_one_or_none()
        if listing and await user_can_manage_listing(db, user, listing):
            return
    roles = {ur.role.code for ur in user.roles if ur.role}
    if roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        return
    raise HTTPException(status_code=403, detail="Not allowed to access this booking")


async def update_booking_status(
    db: AsyncSession, booking_id: str, user: User, payload: BookingStatusUpdate, *, as_provider: bool
) -> BookingOut:
    booking = await _load_booking(db, booking_id)
    await _authorize_booking_access(db, booking, user)
    new_status = payload.status.upper()

    if as_provider:
        allowed = PROVIDER_TRANSITIONS.get(booking.status, set())
        if new_status not in allowed:
            raise HTTPException(status_code=400, detail=f"Cannot move from {booking.status} to {new_status}")
    else:
        if new_status != BookingStatus.CANCELLED.value or booking.status not in PATIENT_CANCEL_FROM:
            raise HTTPException(status_code=400, detail="Patients can only cancel pending/confirmed bookings")

    old = booking.status
    booking.status = new_status
    if new_status == BookingStatus.CONFIRMED.value:
        booking.confirmed_at = datetime.now(timezone.utc)
    if new_status == BookingStatus.CANCELLED.value:
        booking.cancelled_at = datetime.now(timezone.utc)
        booking.cancellation_reason = payload.cancellation_reason or payload.note
        await _release_slot(db, booking.slot_id)
    if new_status == BookingStatus.REJECTED.value:
        booking.cancelled_at = datetime.now(timezone.utc)
        await _release_slot(db, booking.slot_id)
    if new_status == BookingStatus.COMPLETED.value:
        booking.completed_at = datetime.now(timezone.utc)
    if payload.note and as_provider:
        booking.provider_notes = payload.note

    db.add(
        BookingStatusHistory(
            booking_id=booking.id,
            from_status=old,
            to_status=new_status,
            changed_by=user.id,
            note=payload.note or payload.cancellation_reason,
        )
    )
    await notify_user(
        db,
        user_id=booking.patient_user_id,
        event_type=f"booking.{new_status.lower()}",
        title=f"Booking {new_status.title()}",
        body=f"Booking {booking.booking_number} is now {new_status}.",
        payload={"booking_id": booking.id, "status": new_status},
    )
    await write_audit(
        db,
        action=f"booking.status.{new_status.lower()}",
        resource_type="booking",
        resource_id=booking.id,
        actor_user_id=user.id,
    )
    await db.commit()
    return await get_booking(db, booking.id, user)


async def reschedule_booking(db: AsyncSession, booking_id: str, user: User, payload: BookingReschedule) -> BookingOut:
    booking = await _load_booking(db, booking_id)
    if booking.patient_user_id != user.id:
        raise HTTPException(status_code=403, detail="Only the patient can reschedule")
    if booking.status not in PATIENT_CANCEL_FROM:
        raise HTTPException(status_code=400, detail="Only pending/confirmed bookings can be rescheduled")

    old_slot = booking.slot_id
    await _release_slot(db, old_slot)

    listing = await load_listing(db, booking.listing_id) if booking.listing_id else None
    if not listing:
        raise HTTPException(status_code=400, detail="Listing missing for booking")

    if payload.slot_id:
        slot = await _lock_and_book_slot(db, payload.slot_id)
    else:
        await ensure_slots_for_date(db, listing, payload.scheduled_date)
        result = await db.execute(
            select(AppointmentSlot).where(
                AppointmentSlot.listing_id == listing.id,
                AppointmentSlot.slot_date == payload.scheduled_date,
                AppointmentSlot.start_time == payload.start_time,
            )
        )
        found = result.scalar_one_or_none()
        if not found:
            found = AppointmentSlot(
                listing_id=listing.id,
                organization_id=listing.organization_id,
                doctor_id=listing.doctor_id,
                slot_date=payload.scheduled_date,
                start_time=payload.start_time,
                end_time=payload.end_time,
            )
            db.add(found)
            await db.flush()
        slot = await _lock_and_book_slot(db, found.id)

    booking.slot_id = slot.id
    booking.scheduled_date = slot.slot_date
    booking.start_time = slot.start_time
    booking.end_time = slot.end_time
    booking.status = BookingStatus.PENDING.value
    db.add(
        BookingStatusHistory(
            booking_id=booking.id,
            from_status=BookingStatus.CONFIRMED.value,
            to_status=BookingStatus.PENDING.value,
            changed_by=user.id,
            note="Rescheduled by patient",
        )
    )
    await notify_user(
        db,
        user_id=user.id,
        event_type="booking.rescheduled",
        title="Booking rescheduled",
        body=f"Booking {booking.booking_number} was rescheduled and awaits confirmation.",
        payload={"booking_id": booking.id},
    )
    await db.commit()
    return await get_booking(db, booking.id, user)
