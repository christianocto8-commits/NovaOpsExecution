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
