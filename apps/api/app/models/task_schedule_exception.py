from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, func

from app.core.database import Base


class TaskScheduleException(Base):
    __tablename__ = "task_schedule_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
