import { api } from "@/services/api";

export type HaccpLogEntry = {
  id: string;
  outlet_id: string;
  created_by: string | null;
  ccp_name: string;
  item_name: string | null;
  reading_value: number;
  unit: string;
  target_min: number | null;
  target_max: number | null;
  passed: boolean;
  corrective_action: string | null;
  verification_notes: string | null;
  source: string;
  sensor_reading_id: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
};

export type HaccpLogPayload = {
  outlet_id: string;
  ccp_name: string;
  item_name?: string | null;
  reading_value: number;
  unit?: string;
  target_min?: number | null;
  target_max?: number | null;
  corrective_action?: string | null;
  verification_notes?: string | null;
  source?: string;
  sensor_reading_id?: string | null;
  recorded_at?: string | null;
};

export type HaccpSummary = {
  total: number;
  passed: number;
  failed: number;
  critical_failures: number;
  by_ccp: Record<string, { total: number; passed: number; failed: number }>;
};

export function listHaccpEntries(
  params: {
    outlet_id?: string;
    ccp_name?: string;
    passed?: boolean;
    limit?: number;
  } = {}
) {
  const query = new URLSearchParams();
  if (params.outlet_id) query.set("outlet_id", params.outlet_id);
  if (params.ccp_name) query.set("ccp_name", params.ccp_name);
  if (params.passed != null) query.set("passed", String(params.passed));
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api<HaccpLogEntry[]>(`/api/v1/haccp/entries${qs ? `?${qs}` : ""}`);
}

export function getHaccpSummary() {
  return api<HaccpSummary>("/api/v1/haccp/entries/summary");
}

export function getHaccpByOutlet() {
  return api<{ outlet_id: string; total: number }[]>("/api/v1/haccp/entries/by-outlet");
}

export function getHaccpCcps() {
  return api<{ ccps: string[] }>("/api/v1/haccp/ccps");
}

export function createHaccpEntry(payload: HaccpLogPayload) {
  return api<HaccpLogEntry>("/api/v1/haccp/entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHaccpEntry(id: string, payload: Partial<Omit<HaccpLogPayload, "outlet_id">>) {
  return api<HaccpLogEntry>(`/api/v1/haccp/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteHaccpEntry(id: string) {
  return api<null>(`/api/v1/haccp/entries/${id}`, {
    method: "DELETE",
  });
}
