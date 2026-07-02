from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON, func

from app.core.database import Base


class RuntimeTemplate(Base):
    __tablename__ = "runtime_templates"

    id = Column(Integer, primary_key=True, index=True)
    builder_document_id = Column(Integer, ForeignKey("builder_documents.id"), nullable=False)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="active")

    runtime_json = Column(JSON, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())