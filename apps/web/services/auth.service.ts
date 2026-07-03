import { api } from "@/services/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

export async function login(payload: LoginPayload) {
  return api<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return api<AuthUser>("/auth/me", {
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