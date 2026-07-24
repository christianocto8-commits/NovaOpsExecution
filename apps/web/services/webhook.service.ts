import { api } from "@/services/api";

export type WebhookEventType =
  | "task.created"
  | "task.assigned"
  | "task.completed"
  | "checklist.failed"
  | "task.overdue"
  | "form.submitted"
  | "form.approved"
  | "form.rejected"
  | "security.login_failed"
  | "security.device_revoked"
  | "security.admin_device_revoked"
  | "schedule.published";

export type WebhookSubscription = {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  outlet_id: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type WebhookCreatePayload = {
  url: string;
  events: WebhookEventType[];
  secret: string;
  active?: boolean;
  outlet_id?: number | null;
  description?: string | null;
};

export type WebhookUpdatePayload = Partial<WebhookCreatePayload>;

export const WEBHOOK_EVENT_OPTIONS: { value: WebhookEventType; label: string }[] = [
  { value: "task.created", label: "Task created" },
  { value: "task.assigned", label: "Task assigned" },
  { value: "task.completed", label: "Task completed" },
  { value: "checklist.failed", label: "Checklist failed" },
  { value: "task.overdue", label: "Task overdue" },
  { value: "form.submitted", label: "Form submitted" },
  { value: "form.approved", label: "Form approved" },
  { value: "form.rejected", label: "Form rejected" },
  { value: "security.login_failed", label: "Security login failed" },
  { value: "security.device_revoked", label: "Security device revoked" },
  { value: "security.admin_device_revoked", label: "Admin device revoked" },
  { value: "schedule.published", label: "Schedule published" },
];

export async function listWebhooks() {
  return api<WebhookSubscription[]>("/api/v1/webhooks");
}

export async function createWebhook(payload: WebhookCreatePayload) {
  return api<WebhookSubscription>("/api/v1/webhooks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWebhook(id: string, payload: WebhookUpdatePayload) {
  return api<WebhookSubscription>(`/api/v1/webhooks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteWebhook(id: string) {
  return api<void>(`/api/v1/webhooks/${id}`, {
    method: "DELETE",
  });
}

export type WebhookDelivery = {
  id: string;
  subscription_id: string;
  event_type: WebhookEventType;
  url: string;
  status: "delivered" | "failed" | "pending";
  attempt_count: number;
  http_status: number | null;
  error_message: string | null;
  created_at: string;
  delivered_at: string | null;
};

export async function listWebhookDeliveries(limit = 25) {
  return api<WebhookDelivery[]>(`/api/v1/webhooks/deliveries?limit=${limit}`);
}

export type WebhookTestResult = {
  delivered: boolean;
  event_type: string;
  http_status: number | null;
  error_message: string | null;
};

export async function testWebhook(id: string) {
  return api<WebhookTestResult>(`/api/v1/webhooks/${id}/test`, {
    method: "POST",
  });
}
