from typing import Any, Optional
from pydantic import BaseModel


class BuilderDocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    version: int = 1
    status: str = "draft"
    document_json: dict[str, Any]
    created_by: Optional[int] = None


class BuilderDocumentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    version: int
    status: str
    document_json: dict[str, Any]
    created_by: Optional[int] = None

    class Config:
        from_attributes = True