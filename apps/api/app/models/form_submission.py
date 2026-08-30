from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"
    __table_args__ = (
        Index("ix_form_submissions_outlet_status", "outlet_id", "status"),
        Index("ix_form_submissions_template_status", "form_template_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)

    form_template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False, index=True)
    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=False, index=True)
    schedule_id = Column(Integer, ForeignKey("form_schedules.id"), nullable=True)

    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(String(50), nullable=False, default="submitted", index=True)
    score = Column(Float, nullable=True)
    responsible_person_name = Column(String(150), nullable=True)
    client_ref = Column(String(80), nullable=True, index=True)

    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    form_template = relationship("FormTemplate", back_populates="submissions")
    schedule = relationship("FormSchedule", back_populates="submissions")
    answers = relationship("FormAnswer", back_populates="form_submission")