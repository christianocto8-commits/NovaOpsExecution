import { api } from "@/services/api";

export type AuditEventCategory = "task_comment" | "form_submission" | "execution_session";

export type AuditEvent = {
  id: string;
  category: AuditEventCategory;
  action: string;
  summary: string;
  actor_name: string;
  actor_id: number | null;
  outlet_id: number | null;
  outlet_name: string | null;
  resource_type: string;
  resource_id: string;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export type AuditEventsPage = {
  total: number;
  items: AuditEvent[];
};

export type AuditEventsQuery = {
  outletName?: string;
  actor?: string;
  category?: AuditEventCategory | "";
  days?: number;
  limit?: number;
  offset?: number;
};

export const auditService = {
  async listEvents(query: AuditEventsQuery = {}) {
    const params = new URLSearchParams();

    if (query.outletName?.trim()) params.set("outlet_name", query.outletName.trim());
    if (query.actor?.trim()) params.set("actor", query.actor.trim());
    if (query.category) params.set("category", query.category);
    if (query.days != null) params.set("days", String(query.days));
    if (query.limit != null) params.set("limit", String(query.limit));
    if (query.offset != null) params.set("offset", String(query.offset));

    const suffix = params.toString();
    return api<AuditEventsPage>(`/api/v1/audit/events${suffix ? `?${suffix}` : ""}`);
  },
};
