import { api } from "@/services/api";

export type IdentityPermission = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type IdentityRole = {
  id: string;
  name: string;
  slug: "owner" | "admin" | "area_manager" | "outlet" | string;
  description: string | null;
  permissions: IdentityPermission[];
};

export type IdentityOutlet = {
  id: string;
  code: string;
  name: string;
  status: string;
  address: string | null;
  phone: string | null;
};

export type IdentityUser = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  role: IdentityRole;
  outlet: IdentityOutlet | null;
  assigned_outlets: IdentityOutlet[];
};

export type CreateIdentityUserPayload = {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role_id: string;
  outlet_id?: string | null;
  outlet_ids?: string[];
  is_active?: boolean;
};

export type UpdateIdentityUserPayload = Partial<CreateIdentityUserPayload>;

export type CreateIdentityOutletPayload = {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  status?: string;
};

export type UpdateIdentityOutletPayload = Partial<CreateIdentityOutletPayload>;

export async function getIdentityUsers() {
  return api<IdentityUser[]>("/api/v1/identity/users");
}

export async function getIdentityRoles() {
  return api<IdentityRole[]>("/api/v1/identity/roles");
}

export async function getIdentityOutlets() {
  return api<IdentityOutlet[]>("/api/v1/identity/outlets");
}

export async function createIdentityUser(payload: CreateIdentityUserPayload) {
  return api<IdentityUser>("/api/v1/identity/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIdentityUser(userId: string, payload: UpdateIdentityUserPayload) {
  return api<IdentityUser>(`/api/v1/identity/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteIdentityUser(userId: string) {
  return api<{ message: string }>(`/api/v1/identity/users/${userId}`, {
    method: "DELETE",
  });
}

export async function createIdentityOutlet(payload: CreateIdentityOutletPayload) {
  return api<IdentityOutlet>("/api/v1/identity/outlets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIdentityOutlet(
  outletId: string,
  payload: UpdateIdentityOutletPayload
) {
  return api<IdentityOutlet>(`/api/v1/identity/outlets/${outletId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deactivateIdentityOutlet(outletId: string) {
  return api<{ message: string }>(`/api/v1/identity/outlets/${outletId}`, {
    method: "DELETE",
  });
}


export type IdentityOutletOperator = {
  id: string;
  outlet_id: string;
  name: string;
  position: string;
  pin: string;
  is_active: boolean;
};

export type CreateIdentityOutletOperatorPayload = {
  outlet_id: string;
  name: string;
  position: string;
  pin: string;
  is_active?: boolean;
};

export type UpdateIdentityOutletOperatorPayload =
  Partial<CreateIdentityOutletOperatorPayload>;

export async function getIdentityOutletOperators(outletId?: string) {
  const query = outletId ? `?outlet_id=${outletId}` : "";

  return api<IdentityOutletOperator[]>(`/api/v1/identity/operators${query}`);
}

export async function createIdentityOutletOperator(
  payload: CreateIdentityOutletOperatorPayload
) {
  return api<IdentityOutletOperator>("/api/v1/identity/operators", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateIdentityOutletOperator(
  operatorId: string,
  payload: UpdateIdentityOutletOperatorPayload
) {
  return api<IdentityOutletOperator>(`/api/v1/identity/operators/${operatorId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteIdentityOutletOperator(operatorId: string) {
  return api<{ message: string }>(`/api/v1/identity/operators/${operatorId}`, {
    method: "DELETE",
  });
}

export type IdentityOutletMetrics = {
  outlet_id: string;
  open_tasks: number;
  completed_today: number;
  compliance: number;
  last_audit: string | null;
  active_operators: number;
};

export async function getIdentityOutletMetrics() {
  return api<IdentityOutletMetrics[]>("/api/v1/identity/outlets/metrics");
}
