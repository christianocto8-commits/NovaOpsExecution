from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, JSON, func

from app.core.database import Base


class ExecutionSession(Base):
    __tablename__ = "execution_sessions"

    id = Column(Integer, primary_key=True, index=True)

    runtime_template_id = Column(Integer, ForeignKey("runtime_templates.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)
    form_template_id = Column(Integer, ForeignKey("form_templates.id"), nullable=True, index=True)
    source_type = Column(String(50), nullable=True)

    status = Column(String(50), nullable=False, default="completed")
    answers_json = Column(JSON, nullable=False)

    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())