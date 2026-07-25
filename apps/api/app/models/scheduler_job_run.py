from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from app.core.database import Base


class SchedulerJobRun(Base):
    __tablename__ = "scheduler_job_runs"

    id = Column(Integer, primary_key=True, index=True)
    job_name = Column(String(120), nullable=False, index=True)
    status = Column(String(40), nullable=False, index=True)
    duration_ms = Column(Integer, nullable=False, default=0)
    result_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False, index=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
