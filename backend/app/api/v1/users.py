from fastapi import APIRouter
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.core.deps import CurrentUser, DbSession
from app.schemas.auth import UserOut
from app.services.auth import user_to_out

router = APIRouter()


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    email: Optional[EmailStr] = None


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user_to_out(user)


@router.patch("/me", response_model=UserOut)
async def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession):
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "email" in data:
        user.email = str(data["email"]) if data["email"] else None
    await db.commit()
    await db.refresh(user)
    return user_to_out(user)
