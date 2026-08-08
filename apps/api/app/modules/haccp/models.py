from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.shared.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class HaccpLogEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "haccp_log_entries"

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
    ccp_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    item_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    reading_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="C", nullable=False)
    target_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    passed: Mapped[bool] = mapped_column(nullable=False, default=True, index=True)
    corrective_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="manual", nullable=False)
    sensor_reading_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("iot_sensor_readings.id", ondelete="SET NULL"),
        nullable=True,
    )
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    outlet = relationship("Outlet")
    creator = relationship("User", foreign_keys=[created_by])
    sensor_reading = relationship("IotSensorReading")