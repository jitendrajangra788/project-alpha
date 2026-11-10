from typing import List, Optional

from pydantic import BaseModel


class AdminDashboardOut(BaseModel):
    total_patients: int
    total_doctors: int
    total_organizations: int
    pending_verifications: int
    total_users: int


class AdminUserOut(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    mobile: str
    is_active: bool
    roles: List[str]


class RoleDetailOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
