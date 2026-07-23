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
