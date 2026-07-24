from pydantic import BaseModel, Field


class SchedulerJobResult(BaseModel):
    task_schedules: dict = Field(default_factory=dict)
    overdue_alerts: dict = Field(default_factory=dict)
    due_soon_alerts: dict = Field(default_factory=dict)
    compliance_digest: dict = Field(default_factory=dict)
