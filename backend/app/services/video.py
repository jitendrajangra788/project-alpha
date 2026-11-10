from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.enums import BookingStatus, BookingType, TimelineEventType, VideoSessionStatus
from app.core.security import ALGORITHM
from app.models.booking import Booking
from app.models.clinical import Consultation
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.user import User
from app.models.video import VideoSession
from app.schemas.video import VideoJoinTokenOut, VideoSessionNotes, VideoSessionOut
from app.services.audit import write_audit
from app.services.clinical import add_timeline
from app.services.notifications import notify_user

ROOM_TOKEN_MINUTES = 15
ICE_SERVERS = [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "stun:stun1.l.google.com:19302"},
]


def session_to_out(session: VideoSession) -> VideoSessionOut:
    return VideoSessionOut.model_validate(session)


async def _booking_for_video(db: AsyncSession, booking_id: str) -> Booking:
    booking = (await db.execute(select(Booking).where(Booking.id == booking_id))).scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status in {BookingStatus.CANCELLED.value, BookingStatus.REJECTED.value, BookingStatus.REFUNDED.value}:
        raise HTTPException(status_code=400, detail="Booking is not active")
    if not (booking.is_online or booking.booking_type == BookingType.VIDEO_CONSULTATION.value):
        raise HTTPException(status_code=400, detail="Booking is not a video consultation")
    if not booking.doctor_id:
        raise HTTPException(status_code=400, detail="Video consultation requires an assigned doctor")
    return booking


async def create_session(db: AsyncSession, user: User, booking_id: str) -> VideoSessionOut:
    booking = await _booking_for_video(db, booking_id)
    await _assert_booking_participant(db, user, booking)

    existing = (await db.execute(select(VideoSession).where(VideoSession.booking_id == booking.id))).scalar_one_or_none()
    if existing:
        if existing.status == VideoSessionStatus.ENDED.value:
            raise HTTPException(status_code=400, detail="Video session already ended")
        return session_to_out(existing)

    session = VideoSession(
        booking_id=booking.id,
        patient_id=booking.patient_id,
        doctor_id=booking.doctor_id,
        room_code=f"room_{uuid4().hex[:16]}",
        status=VideoSessionStatus.SCHEDULED.value,
        provider="webrtc_mock",
    )
    db.add(session)
    await db.flush()
    await notify_user(
        db,
        user_id=booking.patient_user_id,
        event_type="video.scheduled",
        title="Video consultation ready",
        body=f"Your video room for booking {booking.booking_number} is ready to join.",
        payload={"booking_id": booking.id, "session_id": session.id},
    )
    await write_audit(
        db,
        action="video.session.create",
        resource_type="video_session",
        resource_id=session.id,
        actor_user_id=user.id,
        details=booking.id,
    )
    await db.commit()
    await db.refresh(session)
    return session_to_out(session)


async def _assert_booking_participant(db: AsyncSession, user: User, booking: Booking) -> str:
    """Return role: doctor|patient|admin"""
    if booking.patient_user_id == user.id:
        return "patient"
    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
    if doctor and booking.doctor_id == doctor.id:
        return "doctor"
    roles = {ur.role.code for ur in user.roles if ur.role}
    if roles.intersection({"SUPER_ADMIN", "ADMIN"}):
        return "admin"
    raise HTTPException(status_code=403, detail="Not a participant of this consultation")


async def get_session(db: AsyncSession, session_id: str, user: User) -> VideoSessionOut:
    session = await _load_session(db, session_id)
    booking = await _booking_for_video(db, session.booking_id)
    await _assert_booking_participant(db, user, booking)
    return session_to_out(session)


async def _load_session(db: AsyncSession, session_id: str) -> VideoSession:
    session = (await db.execute(select(VideoSession).where(VideoSession.id == session_id))).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Video session not found")
    return session


def _issue_room_token(*, session_id: str, room_code: str, user_id: str, role: str) -> tuple[str, int]:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=ROOM_TOKEN_MINUTES)
    payload = {
        "sub": user_id,
        "type": "video_room",
        "sid": session_id,
        "room": room_code,
        "role": role,
        "exp": expires,
        "jti": str(uuid4()),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, ROOM_TOKEN_MINUTES * 60


def decode_room_token(token: str) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired room token") from exc
    if payload.get("type") != "video_room":
        raise HTTPException(status_code=401, detail="Invalid room token type")
    return payload


async def join_session(db: AsyncSession, session_id: str, user: User) -> VideoJoinTokenOut:
    session = await _load_session(db, session_id)
    if session.status in {VideoSessionStatus.ENDED.value, VideoSessionStatus.CANCELLED.value}:
        raise HTTPException(status_code=400, detail="Session is closed")

    booking = (await db.execute(select(Booking).where(Booking.id == session.booking_id))).scalar_one()
    role = await _assert_booking_participant(db, user, booking)
    if role == "admin":
        role = "doctor"

    now = datetime.now(timezone.utc)
    if role == "doctor":
        session.doctor_joined_at = now
    else:
        session.patient_joined_at = now

    if session.status == VideoSessionStatus.SCHEDULED.value:
        session.status = VideoSessionStatus.WAITING.value
    if session.doctor_joined_at and session.patient_joined_at:
        session.status = VideoSessionStatus.LIVE.value
        session.started_at = session.started_at or now
        if booking.status in {BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value}:
            booking.status = BookingStatus.IN_PROGRESS.value

    token, expires_in = _issue_room_token(
        session_id=session.id, room_code=session.room_code, user_id=user.id, role=role
    )
    await db.commit()

    settings = get_settings()
    # Frontend connects to same API host websocket path
    signaling_url = f"/api/v1/video/ws/{session.id}"
    return VideoJoinTokenOut(
        session_id=session.id,
        room_code=session.room_code,
        role=role,
        access_token=token,
        expires_in=expires_in,
        ice_servers=ICE_SERVERS,
        signaling_url=signaling_url,
        provider=session.provider,
    )


async def end_session(
    db: AsyncSession,
    session_id: str,
    user: User,
    *,
    reason: str = "ended_by_user",
    notes_payload: Optional[VideoSessionNotes] = None,
) -> VideoSessionOut:
    session = await _load_session(db, session_id)
    booking = (await db.execute(select(Booking).where(Booking.id == session.booking_id))).scalar_one()
    role = await _assert_booking_participant(db, user, booking)

    if session.status == VideoSessionStatus.ENDED.value:
        return session_to_out(session)

    now = datetime.now(timezone.utc)
    session.status = VideoSessionStatus.ENDED.value
    session.ended_at = now
    session.end_reason = reason
    booking.status = BookingStatus.COMPLETED.value
    booking.completed_at = now

    if notes_payload and role in {"doctor", "admin"}:
        session.notes = notes_payload.notes
        consultation = None
        if session.consultation_id:
            consultation = (
                await db.execute(select(Consultation).where(Consultation.id == session.consultation_id))
            ).scalar_one_or_none()
        if not consultation:
            consultation = Consultation(
                booking_id=booking.id,
                patient_id=session.patient_id,
                doctor_id=session.doctor_id,
                notes=notes_payload.notes,
                diagnosis=notes_payload.diagnosis,
                is_finalized=notes_payload.finalize_consultation,
            )
            db.add(consultation)
            await db.flush()
            session.consultation_id = consultation.id
        else:
            consultation.notes = notes_payload.notes
            if notes_payload.diagnosis:
                consultation.diagnosis = notes_payload.diagnosis
            consultation.is_finalized = notes_payload.finalize_consultation

        await add_timeline(
            db,
            patient_id=session.patient_id,
            event_type=TimelineEventType.CONSULTATION.value,
            title="Video consultation completed",
            summary=notes_payload.diagnosis or "Consultation notes saved",
            reference_type="video_session",
            reference_id=session.id,
        )

    patient = (await db.execute(select(Patient).where(Patient.id == session.patient_id))).scalar_one()
    await notify_user(
        db,
        user_id=patient.user_id,
        event_type="video.ended",
        title="Video consultation ended",
        body="Your video consultation has ended.",
        payload={"session_id": session.id},
    )
    await write_audit(
        db,
        action="video.session.end",
        resource_type="video_session",
        resource_id=session.id,
        actor_user_id=user.id,
        details=reason,
    )
    await db.commit()
    await db.refresh(session)
    return session_to_out(session)


async def list_my_sessions(db: AsyncSession, user: User) -> list[VideoSessionOut]:
    doctor = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
    patient = (await db.execute(select(Patient).where(Patient.user_id == user.id))).scalar_one_or_none()
    filters = []
    if doctor:
        filters.append(VideoSession.doctor_id == doctor.id)
    if patient:
        filters.append(VideoSession.patient_id == patient.id)
    if not filters:
        return []
    from sqlalchemy import or_

    rows = (
        await db.execute(select(VideoSession).where(or_(*filters)).order_by(VideoSession.created_at.desc()))
    ).scalars().all()
    return [session_to_out(r) for r in rows]
