from pydantic import BaseModel


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str

    model_config = {"from_attributes": True}


class OutletResponse(BaseModel):
    id: int
    organization_id: int | None = None
    name: str
    code: str
    address: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class CurrentOutletResponse(BaseModel):
    outlet: OutletResponse
    organization: OrganizationResponse | None = None
    role: str
    permissions: list[str]
