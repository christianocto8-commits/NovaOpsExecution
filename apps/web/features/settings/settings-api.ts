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
  dashboard_alerts: boolean;
  overdue_alerts: boolean;
  session_timeout_minutes: number;
  enforce_role_permissions: boolean;
};

export type SettingsPayload = Partial<SettingsResponse>;

export async function getSettings() {
  return api<SettingsResponse>("/settings");
}

export async function updateSettings(payload: SettingsPayload) {
  return api<SettingsResponse>("/settings", {
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
