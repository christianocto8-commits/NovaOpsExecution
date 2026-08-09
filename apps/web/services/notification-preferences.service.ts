import { api } from "@/services/api";

export type NotificationPreferences = {
  email_enabled: boolean;
  push_enabled: boolean;
  digest_enabled: boolean;
  sms_enabled: boolean;
  task_incoming_enabled: boolean;
  task_upcoming_enabled: boolean;
  task_overdue_enabled: boolean;
  task_completed_enabled: boolean;
  checklist_failed_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
};

export type HistoryNotes = Record<string, string>;

export async function fetchNotificationPreferences() {
  return api<NotificationPreferences>("/api/v1/notifications/preferences");
}

export async function updateNotificationPreferences(payload: Partial<NotificationPreferences>) {
  return api<NotificationPreferences>("/api/v1/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchHistoryNotes() {
  const response = await api<{ notes: HistoryNotes }>("/api/v1/notifications/history-notes");
  return response.notes;
}

export async function saveHistoryNotes(notes: HistoryNotes) {
  const response = await api<{ notes: HistoryNotes }>("/api/v1/notifications/history-notes", {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
  return response.notes;
}
