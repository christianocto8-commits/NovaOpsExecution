from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False, index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    source_type = Column(String(50), nullable=True)
    source_id = Column(Integer, nullable=True)

    priority = Column(String(50), nullable=False, default="medium", index=True)
    status = Column(String(50), nullable=False, default="open", index=True)

    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    schedule_id = Column(Integer, ForeignKey("task_schedules.id"), nullable=True, index=True)
    shift = Column(String(50), nullable=True)

    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    comments = relationship(
        "TaskComment",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    assignments = relationship(
        "TaskAssignment",
        back_populates="task",
        cascade="all, delete-orphan",
    )

    outlet = relationship("Outlet")
    schedule = relationship("TaskSchedule", back_populates="tasks")

    @property
    def recurrence(self):
        return self.schedule.recurrence if self.schedule else None

    @property
    def due_time(self):
        return self.schedule.due_time if self.schedule else None

    @property
    def weekly_publish_day(self):
        return self.schedule.weekly_publish_day if self.schedule else None

    @property
    def auto_publish(self):
        return self.schedule.auto_publish if self.schedule else None

    @property
    def form_template_id(self):
        if self.source_type == "form_template" and self.source_id:
            return self.source_id
        if self.schedule and self.schedule.form_template_id:
            return self.schedule.form_template_id
        return None

    @property
    def outlet_name(self):
        return self.outlet.name if self.outlet else None
