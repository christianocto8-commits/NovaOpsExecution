from datetime import datetime

from pydantic import BaseModel, Field


class SchedulerJobResult(BaseModel):
    task_schedules: dict = Field(default_factory=dict)
    overdue_alerts: dict = Field(default_factory=dict)
    due_soon_alerts: dict = Field(default_factory=dict)
    sensor_battery_alerts: dict = Field(default_factory=dict)
    scheduled_announcements: dict = Field(default_factory=dict)
    compliance_digest: dict = Field(default_factory=dict)
    scheduled_reports: dict = Field(default_factory=dict)


class SchedulerJobRunResponse(BaseModel):
    id: int
    job_name: str
    status: str
    duration_ms: int
    result_json: dict | None
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None

    model_config = {"from_attributes": True}
