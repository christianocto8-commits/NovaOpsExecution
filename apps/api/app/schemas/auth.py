from pydantic import BaseModel, Field


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
    role: AuthRoleResponse | None = None
    permissions: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True