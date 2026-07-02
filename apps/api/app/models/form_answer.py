from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormAnswer(Base):
    __tablename__ = "form_answers"

    id = Column(Integer, primary_key=True, index=True)

    form_submission_id = Column(Integer, ForeignKey("form_submissions.id"), nullable=False)
    form_field_id = Column(Integer, ForeignKey("form_fields.id"), nullable=False)

    answer_text = Column(Text, nullable=True)
    answer_number = Column(Float, nullable=True)
    answer_boolean = Column(Boolean, nullable=True)
    answer_json = Column(JSON, nullable=True)

    note = Column(Text, nullable=True)
    evidence_url = Column(String(255), nullable=True)
    is_issue = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    form_submission = relationship("FormSubmission", back_populates="answers")
    form_field = relationship("FormField", back_populates="answers")