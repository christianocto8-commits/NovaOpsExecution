import { api } from "@/services/api";

export type AuthUser = {
  user_id: string;
  username: string;
  email: string;
  role: string;
  outlet_id: string | null;
  permissions: string[];
  token_version: number;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export async function login(payload: LoginPayload) {
  return api<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return api<AuthUser>("/api/v1/auth/me", {
    method: "GET",
  });
}

export function logout() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("novaops_token");
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");
}
