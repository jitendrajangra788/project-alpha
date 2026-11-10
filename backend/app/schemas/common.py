from datetime import datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class MessageOut(BaseModel):
    message: str


class Paginated(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampOut(ORMModel):
    created_at: datetime
    updated_at: datetime


class IdOut(ORMModel):
    id: str
