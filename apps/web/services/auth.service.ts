import { api } from "@/services/api";

export type AuthOutletAccessScope = "all" | "multiple" | "single";

export type AuthUser = {
  user: {
    id: string;
    username: string;
    email: string;
    full_name: string;
    is_active: boolean;
  };
  role: {
    id: string;
    name: string;
    slug: string;
  };
  outlet_access: {
    scope: AuthOutletAccessScope;
    outlet_id: string | null;
    outlet_ids: string[];
    outlet_name?: string | null;
    outlet_code?: string | null;
    legacy_outlet_id?: number | null;
    legacy_outlet_ids?: number[];
    outlets?: Array<{
      id: string;
      code: string;
      name: string;
      status: string;
      address: string | null;
      phone: string | null;
    }>;
  };
  permissions: string[];
  token_version: number;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  access_token: string | null;
  refresh_token: string | null;
  token_type: string;
  expires_in_minutes: number;
  requires_otp?: boolean;
  otp_challenge_id?: string | null;
  message?: string | null;
};

export type LoginDeviceSession = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_full_name: string | null;
  user_role: string | null;
  device_label: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string | null;
  expires_at: string;
  is_current: boolean;
};

export async function login(payload: LoginPayload) {
  return api<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(payload: { challengeId: string; code: string }) {
  return api<LoginResponse>("/api/v1/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      challenge_id: payload.challengeId,
      code: payload.code,
    }),
  });
}

export async function getMe() {
  return api<AuthUser>("/api/v1/authorization/context", {
    method: "GET",
  });
}

export async function getLoginDevices() {
  return api<LoginDeviceSession[]>("/api/v1/auth/devices", {
    method: "GET",
  });
}

export async function revokeLoginDevice(sessionId: string) {
  return api<void>(`/api/v1/auth/devices/${sessionId}`, {
    method: "DELETE",
  });
}

export async function getAllLoginDevices() {
  return api<LoginDeviceSession[]>("/api/v1/auth/devices/all", {
    method: "GET",
  });
}

export async function revokeAnyLoginDevice(sessionId: string) {
  return api<void>(`/api/v1/auth/devices/all/${sessionId}`, {
    method: "DELETE",
  });
}

export function logout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("novaops_token");
  localStorage.removeItem("novaops_refresh_token");
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");
  localStorage.removeItem("novaops_workspace_context");
}

export function switchCrewLogout(returnUrl: string) {
  if (typeof window === "undefined") return;

  const workspaceContext = localStorage.getItem("novaops_workspace_context");
  if (workspaceContext) {
    localStorage.setItem("novaops_remember_outlet_context", workspaceContext);
  }

  localStorage.removeItem("novaops_token");
  localStorage.removeItem("novaops_refresh_token");
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");

  const safeReturnUrl = returnUrl.startsWith("/") && !returnUrl.startsWith("//") ? returnUrl : "/dashboard/operator";
  window.location.href = `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}&rememberOutlet=1`;
}
