import { api } from "@/services/api";

export type ActivityAction =
  | "task_completed"
  | "checklist_submitted"
  | "checklist_failed"
  | "capa_created"
  | "capa_resolved"
  | "form_submitted"
  | "announcement_published"
  | "task_overdue";

export type ActivityFeedItem = {
  id: string;
  action: ActivityAction;
  summary: string;
  actor_name: string;
  actor_id: number | null;
  outlet_id: number | null;
  outlet_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  occurred_at: string;
  detail_url: string | null;
  metadata: Record<string, unknown>;
};

export type ActivityFeedPage = {
  total: number;
  items: ActivityFeedItem[];
};

export type ActivityFeedQuery = {
  outletId?: number;
  days?: number;
  limit?: number;
  offset?: number;
};

export const activityService = {
  async getFeed(query: ActivityFeedQuery = {}) {
    const params = new URLSearchParams();
    if (query.outletId != null) params.set("outlet_id", String(query.outletId));
    if (query.days != null) params.set("days", String(query.days));
    if (query.limit != null) params.set("limit", String(query.limit));
    if (query.offset != null) params.set("offset", String(query.offset));

    const suffix = params.toString();
    return api<ActivityFeedPage>(`/api/v1/activity/feed${suffix ? `?${suffix}` : ""}`);
  },
};
