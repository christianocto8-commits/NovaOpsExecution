import { api } from "@/services/api";

export type EnterpriseKind = "inventory" | "purchase" | "labor" | "support";

export type InventoryCountItem = {
  id: string;
  outlet_id: string | null;
  item_name: string;
  unit: string;
  expected_quantity: number;
  actual_quantity: number;
  unit_cost: number;
  reason: string | null;
  counted_at: string | null;
};

export type PurchaseRequestItem = {
  id: string;
  outlet_id: string | null;
  supplier: string;
  item_name: string;
  quantity: number;
  unit: string;
  estimated_cost: number;
  status: string;
  requested_at: string | null;
  approved_at: string | null;
  received_at: string | null;
};

export type LaborAttendanceItem = {
  id: string;
  outlet_id: string | null;
  employee_name: string;
  shift_start: string;
  shift_end: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  status: string;
  note: string | null;
};

export type SupportItem = {
  id: string;
  category: string;
  title: string;
  owner: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  health_score: number | null;
  sla_hours: number | null;
  note: string | null;
};

export type EnterpriseItem =
  | InventoryCountItem
  | PurchaseRequestItem
  | LaborAttendanceItem
  | SupportItem;

export type EnterpriseSummary = {
  inventory_counts: number;
  shrink_value: number;
  waste_value: number;
  open_purchase_requests: number;
  approved_purchase_value: number;
  late_attendance: number;
  missed_attendance: number;
  open_support_items: number;
  average_health_score: number | null;
};

export function listEnterpriseItems<T extends EnterpriseItem>(kind: EnterpriseKind) {
  return api<T[]>(`/api/v1/enterprise-suite/${kind}/items`);
}

export function createEnterpriseItem<T extends EnterpriseItem>(
  kind: EnterpriseKind,
  payload: Omit<T, "id">
) {
  return api<T>(`/api/v1/enterprise-suite/${kind}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEnterpriseItem<T extends EnterpriseItem>(
  kind: EnterpriseKind,
  id: string,
  payload: Omit<T, "id">
) {
  return api<T>(`/api/v1/enterprise-suite/${kind}/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getEnterpriseSummary() {
  return api<EnterpriseSummary>("/api/v1/enterprise-suite/summary");
}
