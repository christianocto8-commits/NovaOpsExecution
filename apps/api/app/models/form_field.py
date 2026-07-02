from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormField(Base):
    __tablename__ = "form_fields"

    id = Column(Integer, primary_key=True, index=True)
    form_template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=False)

    label = Column(String(150), nullable=False)
    field_type = Column(String(50), nullable=False)
    placeholder = Column(String(150), nullable=True)
    help_text = Column(Text, nullable=True)

    is_required = Column(Boolean, default=False)
    options_json = Column(JSON, nullable=True)
    validation_json = Column(JSON, nullable=True)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    form_template = relationship("FormTemplate", back_populates="fields")
    answers = relationship("FormAnswer", back_populates="form_field")