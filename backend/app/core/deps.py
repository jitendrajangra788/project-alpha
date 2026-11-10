from typing import Annotated, Callable, List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.enums import RoleCode
from app.core.security import safe_decode_token
from app.models.user import User
from app.services.auth import load_user

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = safe_decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    user = await load_user(db, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_roles(*roles: RoleCode) -> Callable:
    allowed = {r.value for r in roles}

    async def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        user_roles = {ur.role.code for ur in user.roles if ur.role}
        if user_roles.intersection(allowed):
            return user
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return _checker


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[
    User,
    Depends(require_roles(RoleCode.SUPER_ADMIN, RoleCode.ADMIN)),
]
DbSession = Annotated[AsyncSession, Depends(get_db)]


def user_role_codes(user: User) -> List[str]:
    return [ur.role.code for ur in user.roles if ur.role]
