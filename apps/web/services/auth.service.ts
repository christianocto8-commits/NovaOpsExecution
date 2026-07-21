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
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_minutes: number;
};

export async function login(payload: LoginPayload) {
  return api<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return api<AuthUser>("/api/v1/authorization/context", {
    method: "GET",
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
