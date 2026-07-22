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

