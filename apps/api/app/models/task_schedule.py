from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class TaskSchedule(Base):
    __tablename__ = "task_schedules"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    form_template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=True)
    priority = Column(String(50), nullable=False, default="medium")
    recurrence = Column(String(20), nullable=False)

    shifts_json = Column(JSON, nullable=False, default=list)
    outlet_ids_json = Column(JSON, nullable=False, default=list)

    publish_time = Column(String(5), nullable=False, default="09:00")
    due_time = Column(String(5), nullable=False, default="17:00")
    weekly_publish_day = Column(String(20), nullable=True)
    monthly_publish_day = Column(Integer, nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    auto_publish = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_published_at = Column(DateTime(timezone=True), nullable=True)
    next_publish_at = Column(DateTime(timezone=True), nullable=True)
    one_time_due_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    tasks = relationship("Task", back_populates="schedule", passive_deletes=True)
