from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, description="Username or email")
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class MessageResponse(BaseModel):
    message: str


class PermissionRead(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RoleRead(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    permissions: list[PermissionRead] = []

    model_config = ConfigDict(from_attributes=True)


class OutletRead(BaseModel):
    id: UUID
    code: str
    name: str
    status: str
    address: str | None = None
    phone: str | None = None

    model_config = ConfigDict(from_attributes=True)


class OutletCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    address: str | None = None
    phone: str | None = None
    status: str = "active"


class OutletUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    address: str | None = None
    phone: str | None = None
    status: str | None = None


class UserRead(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str
    is_active: bool
    last_login: datetime | None = None
    role: RoleRead
    outlet: OutletRead | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=80)
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role_id: UUID
    outlet_id: UUID | None = None
    is_active: bool = True


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=80)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role_id: UUID | None = None
    outlet_id: UUID | None = None
    is_active: bool | None = None


class UserMeResponse(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str
    is_active: bool
    last_login: datetime | None
    role: RoleRead
    outlet: OutletRead | None

    model_config = ConfigDict(from_attributes=True)


class AuthContextResponse(BaseModel):
    user_id: UUID
    username: str
    email: str
    role: str
    outlet_id: str | None
    permissions: list[str]
    token_version: int
