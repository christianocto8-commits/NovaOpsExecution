import { api } from "@/services/api";

export type OpsSuiteModule =
  | "inventory"
  | "labor"
  | "food_label"
  | "procurement"
  | "onboarding"
  | "customer_success"
  | "benchmark"
  | "integration";

export type OpsSuiteItem = {
  id: string;
  module: OpsSuiteModule;
  title: string;
  outlet_id: string | null;
  status: string;
  quantity: number | null;
  unit: string | null;
  cost_per_unit: number | null;
  actual_cost: number | null;
  supplier: string | null;
  forecast_quantity: number | null;
  labor_hours: number | null;
  attendance_count: number | null;
  compliance_rule: string | null;
  due_at: string | null;
  metadata_json: Record<string, unknown> | null;
};

export type OpsSuiteItemPayload = Omit<OpsSuiteItem, "id">;

export type OpsSuiteSummary = {
  inventory_items: number;
  labor_items: number;
  food_label_items: number;
  procurement_items: number;
  onboarding_items: number;
  customer_success_items: number;
  benchmark_items: number;
  integration_items: number;
  open_items: number;
  inventory_cost: number;
  forecast_variance: number;
  labor_hours: number;
  open_procurement_items: number;
};

export function listOpsSuiteItems(module?: OpsSuiteModule) {
  const query = module ? `?module=${encodeURIComponent(module)}` : "";
  return api<OpsSuiteItem[]>(`/api/v1/ops-suite/items${query}`);
}

export function createOpsSuiteItem(payload: OpsSuiteItemPayload) {
  return api<OpsSuiteItem>("/api/v1/ops-suite/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOpsSuiteItem(id: string, payload: OpsSuiteItemPayload) {
  return api<OpsSuiteItem>(`/api/v1/ops-suite/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getOpsSuiteSummary() {
  return api<OpsSuiteSummary>("/api/v1/ops-suite/summary");
}
