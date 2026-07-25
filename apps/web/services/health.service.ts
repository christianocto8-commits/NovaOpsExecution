import { api } from "@/services/api";

export type HealthStatus = {
  status: string;
  service: string;
  version: string;
  auth?: string;
  key_name?: string;
};

export async function getHealthStatus() {
  return api<HealthStatus>("/api/v1/health");
}
