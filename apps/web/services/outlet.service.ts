import { api } from "@/services/api";

export type LegacyOutlet = {
  id: number;
  organization_id: number | null;
  name: string;
  code: string;
  address: string | null;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

export type CurrentOutletResponse = {
  outlet: LegacyOutlet;
  organization: { id: number; name: string; slug: string } | null;
  role: string;
  permissions: string[];
};

export type FranchiseHierarchyNode = {
  corporate: string;
  brand: string;
  franchisee: string;
  region: string;
  district: string;
  store_id: number;
  store_name: string;
  store_code: string;
  is_active: boolean;
};

export const outletService = {
  async listMine() {
    return api<LegacyOutlet[]>("/api/v1/outlets/me");
  },

  async getCurrent() {
    return api<CurrentOutletResponse>("/api/v1/outlets/current");
  },

  async updateLocation(outletId: number, payload: { latitude: number; longitude: number }) {
    return api<LegacyOutlet>(`/api/v1/outlets/${outletId}/location`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async updateOutlet(outletId: number, payload: { region?: string | null; district?: string | null }) {
    return api<LegacyOutlet>(`/api/v1/outlets/${outletId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async listHierarchy() {
    return api<FranchiseHierarchyNode[]>("/api/v1/outlets/hierarchy");
  },
};
