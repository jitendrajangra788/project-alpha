from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ConsentCreate(BaseModel):
    grantee_doctor_id: Optional[str] = None
    grantee_organization_id: Optional[str] = None
    purpose: str = Field(default="consultation_followup", min_length=3)
    scope: str = Field(default="medical_records")
    note: Optional[str] = None


class ConsentOut(BaseModel):
    id: str
    patient_id: str
    grantee_doctor_id: Optional[str] = None
    grantee_organization_id: Optional[str] = None
    purpose: str
    scope: str
    status: str
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicineIn(BaseModel):
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    booking_id: Optional[str] = None
    patient_id: str
    chief_complaint: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    instructions: Optional[str] = None
    follow_up_date: Optional[date] = None
    medicines: List[MedicineIn] = []


class MedicineOut(BaseModel):
    id: str
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

    model_config = {"from_attributes": True}


class PrescriptionOut(BaseModel):
    id: str
    consultation_id: str
    patient_id: str
    doctor_id: str
    diagnosis: Optional[str] = None
    instructions: Optional[str] = None
    follow_up_date: Optional[date] = None
    version: int
    is_finalized: bool
    medicines: List[MedicineOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineEventOut(BaseModel):
    id: str
    event_type: str
    title: str
    summary: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    event_at: datetime

    model_config = {"from_attributes": True}


class VitalCreate(BaseModel):
    patient_id: str
    temperature_c: Optional[float] = None
    pulse_bpm: Optional[int] = None
    spo2: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    notes: Optional[str] = None


class VitalOut(BaseModel):
    id: str
    patient_id: str
    recorded_at: datetime
    temperature_c: Optional[float] = None
    pulse_bpm: Optional[int] = None
    spo2: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class LabTestCreate(BaseModel):
    name: str
    code: Optional[str] = None
    category: Optional[str] = None
    sample_type: Optional[str] = None
    price: Optional[float] = None
    turnaround_hours: Optional[int] = None
    fasting_required: bool = False


class LabTestOut(BaseModel):
    id: str
    organization_id: str
    name: str
    code: Optional[str] = None
    category: Optional[str] = None
    sample_type: Optional[str] = None
    price: Optional[float] = None
    turnaround_hours: Optional[int] = None
    fasting_required: bool
    is_active: bool

    model_config = {"from_attributes": True}


class LabResultIn(BaseModel):
    parameter_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    is_abnormal: bool = False


class LabReportCreate(BaseModel):
    organization_id: str
    patient_id: str
    booking_id: Optional[str] = None
    lab_test_id: Optional[str] = None
    title: str
    notes: Optional[str] = None
    results: List[LabResultIn] = []


class LabResultOut(BaseModel):
    id: str
    parameter_name: str
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    is_abnormal: bool

    model_config = {"from_attributes": True}


class LabReportOut(BaseModel):
    id: str
    organization_id: str
    patient_id: str
    booking_id: Optional[str] = None
    lab_test_id: Optional[str] = None
    title: str
    status: str
    notes: Optional[str] = None
    published_at: Optional[datetime] = None
    results: List[LabResultOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientDashboardOut(BaseModel):
    prescriptions: int
    lab_reports: int
    bookings: int
    consents: int
    timeline: List[TimelineEventOut]
