from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class VideoSessionCreate(BaseModel):
    booking_id: str


class VideoSessionNotes(BaseModel):
    notes: str = Field(min_length=1, max_length=5000)
    diagnosis: Optional[str] = None
    finalize_consultation: bool = True


class EndSessionRequest(BaseModel):
    reason: str = "ended_by_user"
    notes: Optional[str] = None
    diagnosis: Optional[str] = None
    finalize_consultation: bool = True


class VideoJoinTokenOut(BaseModel):
    session_id: str
    room_code: str
    role: str
    access_token: str
    expires_in: int
    ice_servers: list[dict]
    signaling_url: str
    provider: str = "webrtc_mock"


class VideoSessionOut(BaseModel):
    id: str
    booking_id: str
    consultation_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    room_code: str
    status: str
    provider: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    doctor_joined_at: Optional[datetime] = None
    patient_joined_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
