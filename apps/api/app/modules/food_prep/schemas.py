from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

FOOD_PREP_CATEGORIES = {
    "raw",
    "prepared",
    "dairy",
    "bakery",
    "beverage",
    "cold_chain",
    "other",
}


class FoodPrepLabelCreate(BaseModel):
    outlet_id: UUID
    item_name: str = Field(min_length=1, max_length=180)
    category: str = Field(default="other", min_length=1, max_length=60)
    batch_code: str | None = Field(default=None, max_length=80)
    quantity_text: str | None = Field(default=None, max_length=60)
    unit: str | None = Field(default=None, max_length=20)
    prepared_notes: str | None = Field(default=None, max_length=2000)
    prepared_at: datetime
    discard_at: datetime
    shelf_hours: int | None = Field(default=None, ge=0, le=24 * 30)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in FOOD_PREP_CATEGORIES:
            raise ValueError("Unsupported food prep category")
        return normalized

    @field_validator("discard_at")
    @classmethod
    def validate_discard(cls, value: datetime) -> datetime:
        return value


class FoodPrepLabelUpdate(BaseModel):
    item_name: str | None = Field(default=None, min_length=1, max_length=180)
    category: str | None = Field(default=None, min_length=1, max_length=60)
    batch_code: str | None = Field(default=None, max_length=80)
    quantity_text: str | None = Field(default=None, max_length=60)
    unit: str | None = Field(default=None, max_length=20)
    prepared_notes: str | None = Field(default=None, max_length=2000)
    prepared_at: datetime | None = None
    discard_at: datetime | None = None
    shelf_hours: int | None = Field(default=None, ge=0, le=24 * 30)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().lower()
        if normalized not in FOOD_PREP_CATEGORIES:
            raise ValueError("Unsupported food prep category")
        return normalized


class FoodPrepLabelRead(BaseModel):
    id: UUID
    outlet_id: UUID
    created_by: UUID | None = None
    item_name: str
    category: str
    batch_code: str | None = None
    quantity_text: str | None = None
    unit: str | None = None
    prepared_notes: str | None = None
    prepared_at: datetime
    discard_at: datetime
    shelf_hours: int | None = None
    discarded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    status: str = "active"

    model_config = {"from_attributes": True}


class FoodPrepLabelSummary(BaseModel):
    total: int
    active: int
    expired: int
    discarded: int
    expiring_soon: int
