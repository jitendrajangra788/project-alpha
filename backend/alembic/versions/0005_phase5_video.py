"""phase5 video

Revision ID: 0005_phase5
Revises: 0004_phase4
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_phase5"
down_revision: Union[str, None] = "0004_phase4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "video_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("booking_id", sa.String(36), sa.ForeignKey("bookings.id"), unique=True, nullable=False),
        sa.Column("consultation_id", sa.String(36), sa.ForeignKey("consultations.id"), nullable=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctors.id"), nullable=False),
        sa.Column("room_code", sa.String(64), unique=True, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="SCHEDULED"),
        sa.Column("provider", sa.String(40), nullable=False, server_default="webrtc_mock"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("doctor_joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("patient_joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_reason", sa.String(120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_video_sessions_patient_id", "video_sessions", ["patient_id"])
    op.create_index("ix_video_sessions_doctor_id", "video_sessions", ["doctor_id"])
    op.create_index("ix_video_sessions_room_code", "video_sessions", ["room_code"])
    op.create_index("ix_video_sessions_status", "video_sessions", ["status"])


def downgrade() -> None:
    op.drop_table("video_sessions")
