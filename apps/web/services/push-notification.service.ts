import { api } from "@/services/api";

export type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  outlet_id?: string;
};

export const pushNotificationService = {
  subscribe(payload: PushSubscriptionPayload) {
    return api<{ id: string; endpoint: string }>("/api/v1/notifications/push/subscribe", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  unsubscribe(endpoint: string) {
    return api<{ message: string }>("/api/v1/notifications/push/unsubscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    });
  },

  test() {
    return api<{ message: string; result: Record<string, number> }>(
      "/api/v1/notifications/push/test",
      { method: "POST" },
    );
  },
};
