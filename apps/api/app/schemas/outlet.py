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
    region: str | None = None
    district: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class OutletLocationUpdate(BaseModel):
    latitude: float
    longitude: float


class OutletUpdate(BaseModel):
    region: str | None = None
    district: str | None = None


class CurrentOutletResponse(BaseModel):
    outlet: OutletResponse
    organization: OrganizationResponse | None = None
    role: str
    permissions: list[str]


class FranchiseHierarchyNode(BaseModel):
    corporate: str
    brand: str
    franchisee: str
    region: str
    district: str
    store_id: int
    store_name: str
    store_code: str
    is_active: bool
