import { getApiRequestCandidates, resolveApiUrlLabel, wakeBackend } from "@/lib/api-url";

const DEFAULT_TIMEOUT_MS = 90000;
const RETRY_DELAYS_MS = [3000, 6000, 12000];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

function getOutletId() {
  if (typeof window === "undefined") return null;

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

function buildConnectionError(lastUrl: string) {
  return `Koneksi ke backend gagal (${lastUrl}). Render free tier bisa tidur 30-60 detik — tunggu sebentar lalu coba lagi. API target: ${resolveApiUrlLabel()}`;
}

function isNetworkLikeFailure(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

function shouldWakeBackend(endpoint: string, options?: RequestInit) {
  const method = (options?.method ?? "GET").toUpperCase();
  return method !== "GET" && method !== "HEAD" && endpoint !== "/api/v1/health";
}

async function executeRequest<T>(requestUrl: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      ...options,
      signal: options?.signal ?? controller.signal,
      headers: buildHeaders(options),
    });

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
  if (shouldWakeBackend(endpoint, options)) {
    await wakeBackend();
  }

  const requestCandidates = getApiRequestCandidates(endpoint);
  let lastError: unknown;
  let lastUrl = requestCandidates[0] ?? resolveApiUrlLabel();

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    for (const requestUrl of requestCandidates) {
      lastUrl = requestUrl;

      try {
        return await executeRequest<T>(requestUrl, options);
      } catch (error) {
        lastError = error;

        if (!isNetworkLikeFailure(error)) {
          throw error;
        }
      }
    }

    if (attempt >= RETRY_DELAYS_MS.length) {
      break;
    }

    await sleep(RETRY_DELAYS_MS[attempt]);
  }

  if (lastError instanceof DOMException && lastError.name === "AbortError") {
    throw new Error(
      "API tidak merespons setelah beberapa percobaan. Backend Render kemungkinan masih bangun dari sleep. Tunggu 30 detik lalu coba lagi."
    );
  }

  if (lastError instanceof TypeError) {
    throw new Error(buildConnectionError(lastUrl));
  }

  throw lastError;
}
