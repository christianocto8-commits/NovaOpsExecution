import { buildApiUrl, isLocalDevEnvironment, resolveApiDisplayUrl } from "@/lib/api-url";
import {
  clearAuthenticatedSession,
  clearBrowserSessionCookie,
  storeAuthenticatedSession,
  usesNativeTokenStorage,
} from "@/lib/auth/browser-session";

const DEFAULT_TIMEOUT_MS = 70000;
const RETRY_DELAY_MS = 5000;
const REFRESH_TOKEN_KEY = "novaops_refresh_token";

let refreshInFlight: Promise<boolean> | null = null;

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

function getOutletId() {
  if (typeof window === "undefined") return null;

  try {
    const workspaceContext = localStorage.getItem("novaops_workspace_context");
    if (workspaceContext) {
      const parsed = JSON.parse(workspaceContext) as {
        legacyOutletId?: number;
        outletId?: string;
      };

      if (parsed?.legacyOutletId != null) {
        return String(parsed.legacyOutletId);
      }

      if (parsed?.outletId) {
        return parsed.outletId;
      }
    }
  } catch {
    // ignore malformed workspace context
  }

  return (
    localStorage.getItem("novaops_outlet_id") ??
    localStorage.getItem("current_outlet_id") ??
    localStorage.getItem("outlet_id")
  );
}

function normalizeErrorMessage(errorBody: unknown): string {
  if (!errorBody) return "Request failed";
  if (typeof errorBody === "string") return errorBody;

  if (Array.isArray(errorBody)) {
    return errorBody.map((item) => normalizeErrorMessage(item)).join(", ");
  }

  if (typeof errorBody === "object") {
    const body = errorBody as Record<string, unknown>;

    if (typeof body.detail === "string") return body.detail;

    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            const record = item as Record<string, unknown>;
            const loc = Array.isArray(record.loc) ? record.loc.join(".") : "";
            const msg = typeof record.msg === "string" ? record.msg : "";
            return loc ? `${loc}: ${msg}` : msg;
          }

          return String(item);
        })
        .filter(Boolean)
        .join(", ");
    }

    if (typeof body.message === "string") return body.message;

    return JSON.stringify(body);
  }

  return String(errorBody);
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetryRequest(endpoint: string, options?: RequestInit) {
  const method = (options?.method ?? "GET").toUpperCase();

  if (method === "GET" || method === "HEAD") return true;
  if (endpoint.includes("/auth/login")) return true;
  if (endpoint.includes("/authorization/context")) return true;

  return false;
}

function isAuthEndpoint(endpoint: string) {
  return (
    endpoint.includes("/auth/login") ||
    endpoint.includes("/auth/verify-otp") ||
    endpoint.includes("/auth/refresh") ||
    endpoint.includes("/auth/browser-session")
  );
}

function buildHeaders(options?: RequestInit) {
  const token = getToken();
  const outletId = getOutletId();
  const baseHeaders = new Headers(options?.headers ?? undefined);

  if (!baseHeaders.has("Content-Type") && !(options?.body instanceof FormData)) {
    baseHeaders.set("Content-Type", "application/json");
  }

  if (token && !baseHeaders.has("Authorization")) {
    baseHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (outletId && !baseHeaders.has("X-Outlet-Id")) {
    baseHeaders.set("X-Outlet-Id", outletId);
  }

  return baseHeaders;
}

function buildConnectionError() {
  const target = resolveApiDisplayUrl();
  if (isLocalDevEnvironment()) {
    return `Koneksi ke backend local gagal (${target}). Pastikan API jalan di port 8000, lalu refresh (Ctrl+Shift+R).`;
  }

  return `Koneksi ke backend gagal. Pastikan VPS API aktif di ${target}, lalu refresh halaman (Ctrl+Shift+R).`;
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      if (usesNativeTokenStorage()) {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        const response = await fetch(buildApiUrl("/api/v1/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) {
          clearAuthenticatedSession();
          return false;
        }

        const payload = (await response.json()) as {
          access_token?: string | null;
          refresh_token?: string | null;
        };
        if (!payload.access_token || !payload.refresh_token) {
          clearAuthenticatedSession();
          return false;
        }

        storeAuthenticatedSession(payload.access_token, payload.refresh_token);
        return true;
      }

      const response = await fetch("/api/v1/auth/browser-session/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        clearAuthenticatedSession();
        clearBrowserSessionCookie();
        return false;
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function executeRequest<T>(
  endpoint: string,
  options?: RequestInit,
  allowRefresh = true
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      signal: options?.signal ?? controller.signal,
      headers: buildHeaders(options),
    });

    if (response.status === 401 && allowRefresh && !isAuthEndpoint(endpoint)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return executeRequest<T>(endpoint, options, false);
      }
    }

    if (!response.ok) {
      let errorBody: unknown = null;

      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }

      throw new Error(normalizeErrorMessage(errorBody));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    return await executeRequest<T>(endpoint, options);
  } catch (error) {
    const canRetry = shouldRetryRequest(endpoint, options);
    const networkLikeFailure =
      error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError");

    if (canRetry && networkLikeFailure) {
      await sleep(RETRY_DELAY_MS);

      try {
        return await executeRequest<T>(endpoint, options);
      } catch (retryError) {
        if (retryError instanceof DOMException && retryError.name === "AbortError") {
          throw new Error(
            "API tidak merespons setelah dua percobaan. Cek VPS backend lalu coba lagi."
          );
        }

        if (retryError instanceof TypeError) {
          throw new Error(buildConnectionError());
        }

        throw retryError;
      }
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("API tidak merespons dalam 70 detik. Cek status VPS backend lalu ulangi.");
    }

    if (error instanceof TypeError) {
      throw new Error(buildConnectionError());
    }

    throw error;
  }
}
