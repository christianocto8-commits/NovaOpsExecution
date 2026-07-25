import { api } from "@/services/api";

export type IotReading = {
  id: string;
  outlet_id: string;
  sensor_type: string;
  value: number;
  unit?: string | null;
  recorded_at: string;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
};

export type IotSensorHealth = {
  outlet_id: string;
  sensor_type: string;
  latest_value: number | null;
  unit?: string | null;
  last_seen_at: string | null;
  minutes_since_seen: number | null;
  status: "online" | "stale" | "offline" | "alert" | string;
  within_threshold: boolean | null;
  threshold_min: number | null;
  threshold_max: number | null;
  calibration_due_at: string | null;
  gateway_id: string | null;
  message: string;
};

export async function listIotReadings(params?: {
  outlet_id?: string;
  sensor_type?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.outlet_id) search.set("outlet_id", params.outlet_id);
  if (params?.sensor_type) search.set("sensor_type", params.sensor_type);
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return api<IotReading[]>(`/api/v1/iot/readings${query ? `?${query}` : ""}`);
}

export async function listIotSensorHealth() {
  return api<IotSensorHealth[]>("/api/v1/iot/health");
}
