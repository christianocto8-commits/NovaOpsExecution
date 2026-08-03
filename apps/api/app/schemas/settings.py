from pydantic import BaseModel


class SettingsResponse(BaseModel):
    organization_name: str = "NovaOps Enterprise"
    workspace_name: str = "Operations Workspace"
    timezone: str = "Asia/Jakarta"
    default_language: str = "en"
    task_auto_archive_days: int = 30
    evidence_required: bool = True
    approval_required: bool = False
    email_notifications: bool = True
    sms_notifications: bool = False
    dashboard_alerts: bool = True
    overdue_alerts: bool = True
    session_timeout_minutes: int = 30
    enforce_role_permissions: bool = True
    date_format: str = "dd/MM/yyyy"
    currency: str = "IDR"
    dashboard_landing: str = "dashboard"
    outlet_grouping: str = "region"
    operating_hours_policy: str = "inherit-brand"
    outlet_manager_required: bool = True
    outlet_template_auto_assign: bool = True
    default_user_role: str = "outlet_manager"
    invite_approval_required: bool = True
    manager_can_reassign_tasks: bool = True
    default_task_due_time: str = "09:00"
    daily_reminder_window: str = "06:00"
    escalation_after_hours: int = 4
    recurring_publish_mode: str = "auto"
    form_category_mode: str = "operational"
    template_version_lock: bool = True
    note_required_by_default: bool = True
    signature_required_by_default: bool = False
    reopen_submissions: bool = True
    lock_edits_after_submit: bool = True
    auto_corrective_action: bool = True
    digest_frequency: str = "daily"
    scheduled_report_audience: str = "owner-and-admin"
    pass_threshold: int = 85
    critical_escalation: bool = True
    corrective_action_sla_hours: int = 24
    photo_required_by_default: bool = True
    max_upload_mb: int = 10
    timestamp_watermark: bool = True
    gps_watermark: bool = True
    geofence_enabled: bool = False
    geofence_radius_meters: int = 200
    audit_retention_days: int = 180
    login_history_visible: bool = True
    template_history_visible: bool = True
    export_format: str = "xlsx"
    webhook_enabled: bool = False
    auto_workflow_on_checklist_fail: bool = False
    checklist_fail_workflow_code: str = ""
    auto_workflow_on_task_completed: bool = False
    task_completed_workflow_code: str = ""
    api_status_mode: str = "connected"
    two_factor_required: bool = False
    password_rotation_days: int = 90
    brand_logo_url: str = ""
    brand_primary_color: str = "#047857"
    iot_temp_min_c: float = 2.0
    iot_temp_max_c: float = 8.0
    iot_auto_fail_enabled: bool = True
    lms_training_gate_enabled: bool = False


class WorkspaceResetRequest(BaseModel):
    confirm_phrase: str


class WorkspaceResetResponse(BaseModel):
    settings_reset: bool
    deleted: dict[str, int]
    message: str


class ReportWipeRequest(BaseModel):
    confirm_phrase: str


class ReportWipeResponse(BaseModel):
    deleted: dict[str, int]
    message: str


class StarterPackInstallResponse(BaseModel):
    ok: bool
    message: str
    templates_created: list[str]
    templates_existing: list[str]
    schedules_created: list[str]
    schedules_existing: list[str]
    outlet_count: int


class SettingsUpdate(BaseModel):
    organization_name: str | None = None
    workspace_name: str | None = None
    timezone: str | None = None
    default_language: str | None = None
    task_auto_archive_days: int | None = None
    evidence_required: bool | None = None
    approval_required: bool | None = None
    email_notifications: bool | None = None
    sms_notifications: bool | None = None
    dashboard_alerts: bool | None = None
    overdue_alerts: bool | None = None
    session_timeout_minutes: int | None = None
    enforce_role_permissions: bool | None = None
    date_format: str | None = None
    currency: str | None = None
    dashboard_landing: str | None = None
    outlet_grouping: str | None = None
    operating_hours_policy: str | None = None
    outlet_manager_required: bool | None = None
    outlet_template_auto_assign: bool | None = None
    default_user_role: str | None = None
    invite_approval_required: bool | None = None
    manager_can_reassign_tasks: bool | None = None
    default_task_due_time: str | None = None
    daily_reminder_window: str | None = None
    escalation_after_hours: int | None = None
    recurring_publish_mode: str | None = None
    form_category_mode: str | None = None
    template_version_lock: bool | None = None
    note_required_by_default: bool | None = None
    signature_required_by_default: bool | None = None
    reopen_submissions: bool | None = None
    lock_edits_after_submit: bool | None = None
    auto_corrective_action: bool | None = None
    digest_frequency: str | None = None
    scheduled_report_audience: str | None = None
    pass_threshold: int | None = None
    critical_escalation: bool | None = None
    corrective_action_sla_hours: int | None = None
    photo_required_by_default: bool | None = None
    max_upload_mb: int | None = None
    timestamp_watermark: bool | None = None
    gps_watermark: bool | None = None
    geofence_enabled: bool | None = None
    geofence_radius_meters: int | None = None
    audit_retention_days: int | None = None
    login_history_visible: bool | None = None
    template_history_visible: bool | None = None
    export_format: str | None = None
    webhook_enabled: bool | None = None
    auto_workflow_on_checklist_fail: bool | None = None
    checklist_fail_workflow_code: str | None = None
    auto_workflow_on_task_completed: bool | None = None
    task_completed_workflow_code: str | None = None
    api_status_mode: str | None = None
    two_factor_required: bool | None = None
    password_rotation_days: int | None = None
    brand_logo_url: str | None = None
    brand_primary_color: str | None = None
    iot_temp_min_c: float | None = None
    iot_temp_max_c: float | None = None
    iot_auto_fail_enabled: bool | None = None
    lms_training_gate_enabled: bool | None = None
