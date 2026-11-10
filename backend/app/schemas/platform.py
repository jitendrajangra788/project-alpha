from typing import Optional

from pydantic import BaseModel, Field


class PlatformSettingsPublic(BaseModel):
    brand_name: str
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    tagline: Optional[str] = None


class PlatformSettingsUpdate(BaseModel):
    brand_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    support_email: Optional[str] = None
    support_phone: Optional[str] = None
    tagline: Optional[str] = None
