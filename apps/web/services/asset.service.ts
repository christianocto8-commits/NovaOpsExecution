import { api } from "@/services/api";

export type EquipmentHealth = {
  id: string;
  name: string;
  outlet_id: string;
  category: string;
  status: string;
  latest_value: number | null;
  unit: string | null;
  last_seen_at: string | null;
  calibration_due_at: string | null;
  gateway_id: string | null;
  message: string;
};

export async function listEquipmentHealth() {
  return api<EquipmentHealth[]>("/api/v1/assets/equipment-health");
}
