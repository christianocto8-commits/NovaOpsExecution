from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class FoodPrepLabel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "food_prep_labels"

    outlet_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_outlets.id"),
        nullable=False,
        index=True,
    )
    created_by: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("identity_users.id"),
        nullable=True,
    )
    item_name: Mapped[str] = mapped_column(String(180), nullable=False)
    category: Mapped[str] = mapped_column(String(60), default="other", nullable=False, index=True)
    batch_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    quantity_text: Mapped[str | None] = mapped_column(String(60), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    prepared_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    prepared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    discard_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    shelf_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    outlet = relationship("Outlet")
    creator = relationship("User", foreign_keys=[created_by])