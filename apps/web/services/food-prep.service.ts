import { api } from "@/services/api";

export type FoodPrepLabel = {
  id: string;
  outlet_id: string;
  created_by: string | null;
  item_name: string;
  category: string;
  batch_code: string | null;
  quantity_text: string | null;
  unit: string | null;
  prepared_notes: string | null;
  prepared_at: string;
  discard_at: string;
  shelf_hours: number | null;
  discarded_at: string | null;
  created_at: string;
  updated_at: string;
  status: string;
};

export type FoodPrepLabelPayload = {
  outlet_id: string;
  item_name: string;
  category: string;
  batch_code?: string | null;
  quantity_text?: string | null;
  unit?: string | null;
  prepared_notes?: string | null;
  prepared_at: string;
  discard_at: string;
  shelf_hours?: number | null;
};

export type FoodPrepSummary = {
  total: number;
  active: number;
  expired: number;
  discarded: number;
  expiring_soon: number;
};

export function listFoodPrepLabels(
  params: {
    outlet_id?: string;
    status?: string;
    limit?: number;
  } = {}
) {
  const query = new URLSearchParams();
  if (params.outlet_id) query.set("outlet_id", params.outlet_id);
  if (params.status) query.set("status", params.status);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api<FoodPrepLabel[]>(`/api/v1/food-prep/labels${qs ? `?${qs}` : ""}`);
}

export function getFoodPrepSummary() {
  return api<FoodPrepSummary>("/api/v1/food-prep/labels/summary");
}

export function getFoodPrepByOutlet() {
  return api<{ outlet_id: string; total: number; active: number; expired: number }[]>(
    "/api/v1/food-prep/labels/by-outlet"
  );
}

export function createFoodLabel(payload: FoodPrepLabelPayload) {
  return api<FoodPrepLabel>("/api/v1/food-prep/labels", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFoodLabel(
  id: string,
  payload: Partial<Omit<FoodPrepLabelPayload, "outlet_id">>
) {
  return api<FoodPrepLabel>(`/api/v1/food-prep/labels/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function discardFoodLabel(id: string) {
  return api<FoodPrepLabel>(`/api/v1/food-prep/labels/${id}/discard`, {
    method: "POST",
  });
}

export function deleteFoodLabel(id: string) {
  return api<null>(`/api/v1/food-prep/labels/${id}`, {
    method: "DELETE",
  });
}
