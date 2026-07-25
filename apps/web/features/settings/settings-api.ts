import { api } from "@/services/api";

export type SettingsResponse = {
  organization_name: string;
  workspace_name: string;
  timezone: string;
  default_language: string;
  task_auto_archive_days: number;
  evidence_required: boolean;
  approval_required: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  dashboard_alerts: boolean;
  overdue_alerts: boolean;
  session_timeout_minutes: number;
  enforce_role_permissions: boolean;
  date_format: string;
  currency: string;
  dashboard_landing: string;
  outlet_grouping: string;
  operating_hours_policy: string;
  outlet_manager_required: boolean;
  outlet_template_auto_assign: boolean;
  default_user_role: string;
  invite_approval_required: boolean;
  manager_can_reassign_tasks: boolean;
  default_task_due_time: string;
  daily_reminder_window: string;
  escalation_after_hours: number;
  recurring_publish_mode: string;
  form_category_mode: string;
  template_version_lock: boolean;
  note_required_by_default: boolean;
  signature_required_by_default: boolean;
  reopen_submissions: boolean;
  lock_edits_after_submit: boolean;
  auto_corrective_action: boolean;
  digest_frequency: string;
  scheduled_report_audience: string;
  pass_threshold: number;
  critical_escalation: boolean;
  corrective_action_sla_hours: number;
  photo_required_by_default: boolean;
  max_upload_mb: number;
  timestamp_watermark: boolean;
  gps_watermark: boolean;
  geofence_enabled: boolean;
  geofence_radius_meters: number;
  audit_retention_days: number;
  login_history_visible: boolean;
  template_history_visible: boolean;
  export_format: string;
  webhook_enabled: boolean;
  auto_workflow_on_checklist_fail: boolean;
  checklist_fail_workflow_code: string;
  auto_workflow_on_task_completed: boolean;
  task_completed_workflow_code: string;
  api_status_mode: string;
  two_factor_required: boolean;
  password_rotation_days: number;
  brand_logo_url: string;
  brand_primary_color: string;
  iot_temp_min_c: number;
  iot_temp_max_c: number;
  iot_auto_fail_enabled: boolean;
  lms_training_gate_enabled: boolean;
};

export const WORKSPACE_SETTINGS_DEFAULTS: SettingsResponse = {
  organization_name: "NovaOps Enterprise",
  workspace_name: "Operations Workspace",
  timezone: "Asia/Jakarta",
  default_language: "en",
  task_auto_archive_days: 30,
  evidence_required: true,
  approval_required: false,
  email_notifications: true,
  sms_notifications: false,
  dashboard_alerts: true,
  overdue_alerts: true,
  session_timeout_minutes: 30,
  enforce_role_permissions: true,
  date_format: "dd/MM/yyyy",
  currency: "IDR",
  dashboard_landing: "dashboard",
  outlet_grouping: "region",
  operating_hours_policy: "inherit-brand",
  outlet_manager_required: true,
  outlet_template_auto_assign: true,
  default_user_role: "outlet_manager",
  invite_approval_required: true,
  manager_can_reassign_tasks: true,
  default_task_due_time: "09:00",
  daily_reminder_window: "06:00",
  escalation_after_hours: 4,
  recurring_publish_mode: "auto",
  form_category_mode: "operational",
  template_version_lock: true,
  note_required_by_default: true,
  signature_required_by_default: false,
  reopen_submissions: true,
  lock_edits_after_submit: true,
  auto_corrective_action: true,
  digest_frequency: "daily",
  scheduled_report_audience: "owner-and-admin",
  pass_threshold: 85,
  critical_escalation: true,
  corrective_action_sla_hours: 24,
  photo_required_by_default: true,
  max_upload_mb: 10,
  timestamp_watermark: true,
  gps_watermark: true,
  geofence_enabled: false,
  geofence_radius_meters: 200,
  audit_retention_days: 180,
  login_history_visible: true,
  template_history_visible: true,
  export_format: "xlsx",
  webhook_enabled: false,
  auto_workflow_on_checklist_fail: false,
  checklist_fail_workflow_code: "",
  auto_workflow_on_task_completed: false,
  task_completed_workflow_code: "",
  api_status_mode: "connected",
  two_factor_required: false,
  password_rotation_days: 90,
  brand_logo_url: "",
  brand_primary_color: "#047857",
  iot_temp_min_c: 2,
  iot_temp_max_c: 8,
  iot_auto_fail_enabled: true,
  lms_training_gate_enabled: true,
};

export type SettingsPayload = Partial<SettingsResponse>;

export async function getSettings() {
  return api<SettingsResponse>("/api/v1/settings");
}

export async function updateSettings(payload: SettingsPayload) {
  return api<SettingsResponse>("/api/v1/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type PasswordChangePayload = {
  current_password: string;
  new_password: string;
};

export async function changePassword(payload: PasswordChangePayload) {
  return api<{ message: string }>("/api/v1/identity/me/password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type WorkspaceResetResponse = {
  settings_reset: boolean;
  deleted: Record<string, number>;
  message: string;
};

export async function resetWorkspace(confirmPhrase: string) {
  return api<WorkspaceResetResponse>("/api/v1/settings/reset-workspace", {
    method: "POST",
    body: JSON.stringify({ confirm_phrase: confirmPhrase }),
  });
}
