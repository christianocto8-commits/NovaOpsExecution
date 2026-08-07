from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, description="Username or email")
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in_minutes: int = 0
    requires_otp: bool = False
    otp_challenge_id: UUID | None = None
    message: str | None = None


class OtpVerifyRequest(BaseModel):
    challenge_id: UUID
    code: str = Field(min_length=6, max_length=6)


class LoginDeviceSessionResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    user_email: str | None = None
    user_full_name: str | None = None
    user_role: str | None = None
    device_label: str
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
    last_seen_at: datetime | None = None
    expires_at: datetime
    is_current: bool = False


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


class RolePermissionsUpdate(BaseModel):
    permission_codes: list[str] = Field(default_factory=list)


class RegionRead(BaseModel):
    id: UUID
    code: str
    name: str
    status: str
    organization_id: UUID

    model_config = ConfigDict(from_attributes=True)


class RegionCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    status: str = "active"


class RegionUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    status: str | None = None


class DistrictRead(BaseModel):
    id: UUID
    code: str
    name: str
    status: str
    organization_id: UUID
    region_id: UUID
    region: RegionRead | None = None

    model_config = ConfigDict(from_attributes=True)


class DistrictCreate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=160)
    region_id: UUID
    status: str = "active"


class DistrictUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=40)
    name: str | None = Field(default=None, min_length=2, max_length=160)
    region_id: UUID | None = None
    status: str | None = None


class OutletRead(BaseModel):
    id: UUID
    code: str
    name: str
    status: str
    address: str | None = None
    phone: str | None = None
    operating_hours_open: str | None = None
    operating_hours_close: str | None = None
    region_id: UUID | None = None
    district_id: UUID | None = None

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
    operating_hours_open: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    operating_hours_close: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")


class UserRead(BaseModel):
    id: UUID
    email: str
    username: str
    full_name: str
    phone_number: str | None = None
    is_active: bool
    last_login: datetime | None = None
    role: RoleRead
    outlet: OutletRead | None = None
    assigned_outlets: list[OutletRead] = []
    region_id: UUID | None = None
    district_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class OutletMetricsRead(BaseModel):
    outlet_id: UUID
    open_tasks: int = 0
    completed_today: int = 0
    compliance: float = 0
    last_audit: datetime | None = None
    active_operators: int = 0


class OutletOperatorRead(BaseModel):
    id: UUID
    outlet_id: UUID
    name: str
    position: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class OutletOperatorCreate(BaseModel):
    outlet_id: UUID
    name: str = Field(min_length=2, max_length=160)
    position: str = Field(min_length=2, max_length=80)
    pin: str = Field(min_length=3, max_length=20)
    is_active: bool = True


class OutletOperatorUpdate(BaseModel):
    outlet_id: UUID | None = None
    name: str | None = Field(default=None, min_length=2, max_length=160)
    position: str | None = Field(default=None, min_length=2, max_length=80)
    pin: str | None = Field(default=None, min_length=3, max_length=20)
    is_active: bool | None = None


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=80)
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    phone_number: str | None = Field(default=None, max_length=40)
    role_id: UUID
    outlet_id: UUID | None = None
    outlet_ids: list[UUID] = []
    region_id: UUID | None = None
    district_id: UUID | None = None
    is_active: bool = True


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(default=None, min_length=3, max_length=80)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    phone_number: str | None = Field(default=None, max_length=40)
    role_id: UUID | None = None
    outlet_id: UUID | None = None
    outlet_ids: list[UUID] | None = None
    region_id: UUID | None = None
    district_id: UUID | None = None
    is_active: bool | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


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


class AuthContextUserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    full_name: str
    is_active: bool


class AuthContextRoleResponse(BaseModel):
    id: UUID
    name: str
    slug: str


class AuthContextOutletAccessResponse(BaseModel):
    scope: str
    outlet_id: UUID | None = None
    outlet_ids: list[UUID] = []
    outlet_name: str | None = None
    outlet_code: str | None = None
    legacy_outlet_id: int | None = None
    legacy_outlet_ids: list[int] = []
    outlets: list[OutletRead] = []


class AuthContextResponse(BaseModel):
    user: AuthContextUserResponse
    role: AuthContextRoleResponse
    outlet_access: AuthContextOutletAccessResponse
    permissions: list[str]
    token_version: int


class BulkImportRowResult(BaseModel):
    row: int
    entity: str
    identifier: str
    status: str
    message: str | None = None


class BulkImportResponse(BaseModel):
    outlets_created: int = 0
    outlets_skipped: int = 0
    users_created: int = 0
    users_skipped: int = 0
    rows: list[BulkImportRowResult] = []
