from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Time, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormSchedule(Base):
    __tablename__ = "form_schedules"

    id = Column(Integer, primary_key=True, index=True)
    form_template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)

    shift = Column(String(50), nullable=True)
    frequency = Column(String(50), nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    form_template = relationship("FormTemplate", back_populates="schedules")
    submissions = relationship("FormSubmission", back_populates="schedule")