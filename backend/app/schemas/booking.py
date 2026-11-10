from datetime import date, datetime, time
from typing import List, Optional

from pydantic import BaseModel, Field


class SlotOut(BaseModel):
    id: str
    listing_id: str
    slot_date: date
    start_time: time
    end_time: time
    status: str
    capacity: int
    booked_count: int
    remaining: int

    model_config = {"from_attributes": True}


class AvailabilityResponse(BaseModel):
    listing_id: str
    date: date
    slots: List[SlotOut]


class BookingCreate(BaseModel):
    listing_id: str
    slot_id: Optional[str] = None
    scheduled_date: date
    start_time: time
    end_time: time
    booking_type: Optional[str] = None
    service_name: Optional[str] = None
    patient_notes: Optional[str] = Field(default=None, max_length=1000)
    is_home_service: bool = False
    is_online: bool = False
    address_line: Optional[str] = None
    city: Optional[str] = None
    pin_code: Optional[str] = None


class BookingStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None
    cancellation_reason: Optional[str] = None


class BookingReschedule(BaseModel):
    slot_id: Optional[str] = None
    scheduled_date: date
    start_time: time
    end_time: time


class BookingOut(BaseModel):
    id: str
    booking_number: str
    booking_type: str
    status: str
    payment_status: str
    listing_id: Optional[str] = None
    listing_name: Optional[str] = None
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    patient_id: str
    scheduled_date: date
    start_time: time
    end_time: time
    service_name: Optional[str] = None
    amount: Optional[float] = None
    currency: str
    patient_notes: Optional[str] = None
    provider_notes: Optional[str] = None
    is_home_service: bool
    is_online: bool
    address_line: Optional[str] = None
    city: Optional[str] = None
    pin_code: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NotificationOut(BaseModel):
    id: str
    event_type: str
    title: str
    body: str
    is_read: bool
    channel: str
    created_at: datetime

    model_config = {"from_attributes": True}
