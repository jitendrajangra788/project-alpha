from typing import Optional

from sqlalchemy import String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class PlatformSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "platform_settings"
    __table_args__ = (UniqueConstraint("key", name="uq_platform_setting_key"),)

    key: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
