from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormTemplate(Base):
    __tablename__ = "form_templates"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    form_type = Column(String(50), nullable=False)

    outlet_id = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    fields = relationship("FormField", back_populates="form_template")
    versions = relationship(
        "FormTemplateVersion",
        back_populates="form_template",
        cascade="all, delete-orphan",
    )
    schedules = relationship("FormSchedule", back_populates="form_template")
    submissions = relationship("FormSubmission", back_populates="form_template")