from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class FormTemplateVersion(Base):
    __tablename__ = "form_template_versions"

    id = Column(Integer, primary_key=True, index=True)
    form_template_id = Column(
        Integer,
        ForeignKey("form_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False)
    snapshot_json = Column(JSON, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    form_template = relationship("FormTemplate", back_populates="versions")
