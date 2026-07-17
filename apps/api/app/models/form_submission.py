from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)

    form_template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("form_schedules.id"), nullable=True)

    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(String(50), nullable=False, default="submitted")
    score = Column(Float, nullable=True)
    responsible_person_name = Column(String(150), nullable=True)

    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    form_template = relationship("FormTemplate", back_populates="submissions")
    schedule = relationship("FormSchedule", back_populates="submissions")
    answers = relationship("FormAnswer", back_populates="form_submission")