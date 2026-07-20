import { api } from "@/services/api";

export type WebhookEventType = "task.completed" | "checklist.failed" | "task.overdue";

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
  { value: "task.completed", label: "Task completed" },
  { value: "checklist.failed", label: "Checklist failed" },
  { value: "task.overdue", label: "Task overdue" },
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
