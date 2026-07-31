"use client";

import { Capacitor } from "@capacitor/core";

const ACCESS_TOKEN_KEY = "novaops_token";
const REFRESH_TOKEN_KEY = "novaops_refresh_token";
const SESSION_MARKER_KEY = "novaops_session_present";

export function usesNativeTokenStorage() {
  return Capacitor.isNativePlatform();
}

export function hasBrowserSessionMarker() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_MARKER_KEY) === "1";
}

export function storeAuthenticatedSession(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_MARKER_KEY, "1");

  if (usesNativeTokenStorage()) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthenticatedSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_MARKER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function establishBrowserSession(accessToken: string, refreshToken: string) {
  const response = await fetch("/api/v1/auth/browser-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  });
  if (!response.ok) {
    throw new Error("Gagal membuat sesi login yang aman.");
  }
}

export function clearBrowserSessionCookie() {
  void fetch("/api/v1/auth/browser-session", {
    method: "DELETE",
    keepalive: true,
  });
}
