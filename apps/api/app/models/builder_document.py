from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, JSON, func

from app.core.database import Base


class BuilderDocument(Base):
    __tablename__ = "builder_documents"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)

    version = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="draft")

    document_json = Column(JSON, nullable=False)

    created_by = Column(
    Integer,
    ForeignKey("users.id"),
    nullable=True,
)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())