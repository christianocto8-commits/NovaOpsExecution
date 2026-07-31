import { api } from "@/services/api";

export type IncidentStatus = "reported" | "triaged" | "investigating" | "resolved" | "closed";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type FollowUpStatus = "open" | "in_progress" | "completed" | "cancelled";

export type FollowUpAction = {
  id: string;
  incident_id: string | null;
  outlet_id: string;
  created_by: string;
  assignee_id: string | null;
  title: string;
  instructions: string | null;
  status: FollowUpStatus;
  priority: IncidentSeverity;
  due_at: string | null;
  completed_at: string | null;
  completion_note: string | null;
  evidence_urls: string[];
  source_type: string | null;
  source_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Incident = {
  id: string;
  outlet_id: string;
  reporter_id: string;
  owner_id: string | null;
  title: string;
  description: string;
  category: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurred_at: string;
  due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  root_cause: string | null;
  resolution: string | null;
  evidence_urls: string[];
  source_type: string | null;
  source_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  follow_ups: FollowUpAction[];
};

export type IncidentSummary = {
  total: number;
  open: number;
  critical_open: number;
  overdue: number;
  resolved: number;
};

export type IncidentCreatePayload = {
  outlet_id: string;
  title: string;
  description: string;
  category: string;
  severity: IncidentSeverity;
  occurred_at: string;
  due_at?: string | null;
  evidence_urls?: string[];
  source_type?: string | null;
  source_id?: string | null;
};

export type FollowUpCreatePayload = Pick<
  FollowUpAction,
  "incident_id" | "outlet_id" | "assignee_id" | "title" | "instructions" | "priority" | "due_at"
> &
  Partial<Pick<FollowUpAction, "source_type" | "source_id">>;

export const incidentService = {
  list(filters?: { status?: string; severity?: string; outletId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.severity) params.set("severity", filters.severity);
    if (filters?.outletId) params.set("outlet_id", filters.outletId);
    const query = params.size ? `?${params.toString()}` : "";
    return api<Incident[]>(`/api/v1/incidents${query}`);
  },
  summary() {
    return api<IncidentSummary>("/api/v1/incidents/summary");
  },
  create(payload: IncidentCreatePayload) {
    return api<Incident>("/api/v1/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  update(id: string, payload: Partial<Incident>) {
    return api<Incident>(`/api/v1/incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  createFollowUp(payload: FollowUpCreatePayload) {
    return api<FollowUpAction>("/api/v1/follow-ups", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateFollowUp(id: string, payload: Partial<FollowUpAction>) {
    return api<FollowUpAction>(`/api/v1/follow-ups/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
