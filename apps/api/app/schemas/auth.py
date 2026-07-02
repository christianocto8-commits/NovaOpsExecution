from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthRoleResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class AuthUserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool
    role: Optional[AuthRoleResponse] = None
    permissions: list[str] = []

    class Config:
        from_attributes = True