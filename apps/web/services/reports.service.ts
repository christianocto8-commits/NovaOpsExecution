import { buildApiUrl } from "@/lib/api-url";

export type FailedChecklistItemTrend = {
  label: string;
  field_id: number | null;
  failure_count: number;
  sample_reason: string;
};

export type FailedChecklistItemsReport = {
  days: number;
  limit: number;
  items: FailedChecklistItemTrend[];
};

export type TemplateTrendPoint = {
  date: string;
  date_key: string;
  score: number;
  pass_rate: number;
  submissions: number;
};

export type TemplateTrendsReport = {
  template_id: number;
  days: number;
  points: TemplateTrendPoint[];
};

export type DigestSendResult = {
  sent: boolean;
  reason: string;
  recipients: number;
  delivered: number;
};

export type OutletBenchmark = {
  rank: number;
  outlet_id: number;
  outlet_name: string;
  region: string | null;
  district: string | null;
  completed_tasks: number;
  total_tasks: number;
  completion_rate: number;
  overdue_tasks: number;
  compliance_rate: number;
  audit_score: number;
  score_delta_from_average: number;
  status: string;
};

export type BenchmarkSummary = {
  average_compliance: number;
  best_outlet: string | null;
  worst_outlet: string | null;
  at_risk_outlets: number;
  outlets: OutletBenchmark[];
};

export type ScheduledReportConfig = {
  enabled: boolean;
  frequency: string;
  format: string;
  include_evidence_bundle: boolean;
  recipients: string[];
  last_sent_at: string | null;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

function getOutletId() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("novaops_outlet_id") ??
    localStorage.getItem("current_outlet_id") ??
    localStorage.getItem("outlet_id")
  );
}

function authHeaders() {
  const token = getToken();
  const outletId = getOutletId();
  const headers = new Headers();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (outletId) headers.set("X-Outlet-Id", outletId);

  return headers;
}

export async function getBenchmarks(): Promise<BenchmarkSummary> {
  const response = await fetch(buildApiUrl("/api/v1/reports/benchmarks"), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("Failed to load benchmark dashboard.");
  return response.json() as Promise<BenchmarkSummary>;
}

export async function getScheduledReportConfig(): Promise<ScheduledReportConfig> {
  const response = await fetch(buildApiUrl("/api/v1/reports/scheduled"), {
    headers: authHeaders(),
  });

  if (!response.ok) throw new Error("Failed to load scheduled report config.");
  return response.json() as Promise<ScheduledReportConfig>;
}

export async function updateScheduledReportConfig(payload: ScheduledReportConfig) {
  const headers = authHeaders();
  headers.set("Content-Type", "application/json");
  const response = await fetch(buildApiUrl("/api/v1/reports/scheduled"), {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to save scheduled report config.");
  return response.json() as Promise<ScheduledReportConfig>;
}

export async function downloadComplianceExport(format = "xlsx"): Promise<void> {
  const token = getToken();
  const outletId = getOutletId();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (outletId) {
    headers.set("X-Outlet-Id", outletId);
  }

  const response = await fetch(
    buildApiUrl(`/api/v1/reports/compliance/export?format=${encodeURIComponent(format)}`),
    { headers }
  );

  if (!response.ok) {
    let message = "Export failed";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `compliance-export.${format}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadAuditBundle(days = 30): Promise<void> {
  const token = getToken();
  const outletId = getOutletId();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (outletId) {
    headers.set("X-Outlet-Id", outletId);
  }

  const response = await fetch(
    buildApiUrl(`/api/v1/reports/compliance/audit-bundle?days=${encodeURIComponent(days)}`),
    { headers }
  );

  if (!response.ok) {
    let message = "Audit bundle export failed";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? "novaops-audit-bundle.zip";

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function sendComplianceDigestNow() {
  const token = getToken();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl("/api/v1/reports/compliance/send-digest-now"), {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    let message = "Gagal mengirim compliance digest.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  return (await response.json()) as DigestSendResult;
}

export async function getFailedChecklistItems(
  options: { limit?: number; days?: number } = {}
): Promise<FailedChecklistItemsReport> {
  const token = getToken();
  const outletId = getOutletId();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (outletId) {
    headers.set("X-Outlet-Id", outletId);
  }

  const params = new URLSearchParams();
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.days != null) params.set("days", String(options.days));

  const response = await fetch(
    buildApiUrl(`/api/v1/reports/compliance/failed-items?${params.toString()}`),
    { headers }
  );

  if (!response.ok) {
    let message = "Failed to load failed checklist items";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  return response.json() as Promise<FailedChecklistItemsReport>;
}

export async function getTemplateComplianceTrends(
  templateId: string,
  options: { days?: number } = {}
): Promise<TemplateTrendsReport> {
  const token = getToken();
  const outletId = getOutletId();
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (outletId) {
    headers.set("X-Outlet-Id", outletId);
  }

  const params = new URLSearchParams();
  params.set("template_id", templateId);
  if (options.days != null) params.set("days", String(options.days));

  const response = await fetch(
    buildApiUrl(`/api/v1/reports/compliance/template-trends?${params.toString()}`),
    { headers }
  );

  if (!response.ok) {
    let message = "Failed to load template trends";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  return response.json() as Promise<TemplateTrendsReport>;
}
