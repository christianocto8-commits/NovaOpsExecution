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
  gateway_status: string | null;
  battery_level: number | null;
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
  lifecycle_status: string;
  replacement_for_id: string | null;
  gateway_id: string | null;
  pairing_code: string | null;
  gateway_provisioned_at: string | null;
  battery_level: number | null;
  battery_alert_threshold: number | null;
  sensor_enabled: boolean;
  calibration_status: string;
  replacement_approval_status: string;
  replacement_requested_at: string | null;
  replacement_approved_at: string | null;
  qr_code: string | null;
  maintenance_due_at: string | null;
  calibration_due_at: string | null;
  notes: string | null;
};

export type EquipmentRegisterPayload = Omit<EquipmentRegisterItem, "id">;

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
  gateway_status: string | null;
  battery_level: number | null;
  calibration_due_at: string | null;
};

export async function listEquipmentHealth() {
  return api<EquipmentHealth[]>("/api/v1/assets/equipment-health");
}

export async function listEquipmentRegister() {
  return api<EquipmentRegisterItem[]>("/api/v1/assets/equipment");
}

export async function createEquipmentRegisterItem(payload: EquipmentRegisterPayload) {
  return api<EquipmentRegisterItem>("/api/v1/assets/equipment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEquipmentRegisterItem(id: string, payload: EquipmentRegisterPayload) {
  return api<EquipmentRegisterItem>(`/api/v1/assets/equipment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function requestEquipmentReplacement(id: string) {
  return api<EquipmentRegisterItem>(`/api/v1/assets/equipment/${id}/request-replacement`, {
    method: "POST",
  });
}

export async function approveEquipmentReplacement(id: string) {
  return api<EquipmentRegisterItem>(`/api/v1/assets/equipment/${id}/approve-replacement`, {
    method: "POST",
  });
}

export async function processBatteryAlerts() {
  return api<{
    created_tasks: number;
    skipped_existing: number;
    notifications_sent: number;
  }>("/api/v1/assets/process-battery-alerts", {
    method: "POST",
  });
}

export async function listTemperatureLog() {
  return api<TemperatureLog[]>("/api/v1/assets/temperature-log");
}
