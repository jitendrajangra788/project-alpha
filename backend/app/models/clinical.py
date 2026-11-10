from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import ConsentStatus, ReportStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PatientConsent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "patient_consents"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    grantee_user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    grantee_organization_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=True)
    grantee_doctor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=True)
    purpose: Mapped[str] = mapped_column(String(120), nullable=False)
    scope: Mapped[str] = mapped_column(String(255), nullable=False, default="medical_records")
    status: Mapped[str] = mapped_column(String(20), default=ConsentStatus.ACTIVE.value, nullable=False, index=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Consultation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "consultations"

    booking_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bookings.id"), nullable=True, unique=True)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=False, index=True)
    chief_complaint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    prescriptions: Mapped[List["Prescription"]] = relationship(back_populates="consultation")


class Prescription(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "prescriptions"
    __table_args__ = (UniqueConstraint("consultation_id", "version", name="uq_prescription_version"),)

    consultation_id: Mapped[str] = mapped_column(String(36), ForeignKey("consultations.id"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(String(36), ForeignKey("doctors.id"), nullable=False, index=True)
    diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_finalized: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    consultation: Mapped["Consultation"] = relationship(back_populates="prescriptions")
    medicines: Mapped[List["PrescriptionMedicine"]] = relationship(
        back_populates="prescription", cascade="all, delete-orphan"
    )


class PrescriptionMedicine(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "prescription_medicines"

    prescription_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False
    )
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    instructions: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    prescription: Mapped["Prescription"] = relationship(back_populates="medicines")


class PatientDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "patient_documents"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False, default="other")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)


class PatientTimelineEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "patient_timeline_events"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PatientVital(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "patient_vitals"

    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    recorded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    temperature_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pulse_bpm: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    spo2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    systolic_bp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    diastolic_bp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class LabTest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "lab_tests"

    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    sample_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    turnaround_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fasting_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class LabReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "lab_reports"

    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    booking_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("bookings.id"), nullable=True)
    lab_test_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("lab_tests.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default=ReportStatus.DRAFT.value, nullable=False, index=True)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    results: Mapped[List["LabReportResult"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class LabReportResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "lab_report_results"

    report_id: Mapped[str] = mapped_column(String(36), ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=False)
    parameter_name: Mapped[str] = mapped_column(String(160), nullable=False)
    value: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    reference_range: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_abnormal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    report: Mapped["LabReport"] = relationship(back_populates="results")
