from pydantic import BaseModel


class SettingsResponse(BaseModel):
    organization_name: str = "NovaOps Enterprise"
    workspace_name: str = "Operations Workspace"
    timezone: str = "Asia/Jakarta"
    default_language: str = "en"
    task_auto_archive_days: int = 30
    evidence_required: bool = True
    approval_required: bool = True
    email_notifications: bool = True
    dashboard_alerts: bool = True
    overdue_alerts: bool = True
    session_timeout_minutes: int = 120
    enforce_role_permissions: bool = True


class SettingsUpdate(BaseModel):
    organization_name: str | None = None
    workspace_name: str | None = None
    timezone: str | None = None
    default_language: str | None = None
    task_auto_archive_days: int | None = None
    evidence_required: bool | None = None
    approval_required: bool | None = None
    email_notifications: bool | None = None
    dashboard_alerts: bool | None = None
    overdue_alerts: bool | None = None
    session_timeout_minutes: int | None = None
    enforce_role_permissions: bool | None = None