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

export type EquipmentRegisterItem = {
  id: string;
  name: string;
  outlet_id: string | null;
  category: string;
  serial_number: string | null;
  vendor: string | null;
  location: string | null;
  status: string;
  qr_code: string | null;
  maintenance_due_at: string | null;
  calibration_due_at: string | null;
  notes: string | null;
};

export type TemperatureLog = {
  id: string;
  outlet_id: string;
  value: number;
  unit: string | null;
  recorded_at: string;
  status: "pass" | "fail" | string;
  threshold_min: number;
  threshold_max: number;
  gateway_id: string | null;
  calibration_due_at: string | null;
};

export async function listEquipmentHealth() {
  return api<EquipmentHealth[]>("/api/v1/assets/equipment-health");
}

export async function listEquipmentRegister() {
  return api<EquipmentRegisterItem[]>("/api/v1/assets/equipment");
}

export async function listTemperatureLog() {
  return api<TemperatureLog[]>("/api/v1/assets/temperature-log");
}
