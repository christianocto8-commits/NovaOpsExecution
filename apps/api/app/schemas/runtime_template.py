from typing import Any, Optional

from pydantic import BaseModel


class RuntimeTemplateResponse(BaseModel):
    id: int
    builder_document_id: int
    title: str
    description: Optional[str] = None
    version: int
    status: str
    runtime_json: dict[str, Any]

    class Config:
        from_attributes = True