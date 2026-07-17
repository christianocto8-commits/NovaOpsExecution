const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 70000;
const RETRY_DELAY_MS = 5000;

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

function shouldRetryRequest(endpoint: string, options?: RequestInit) {
  const method = (options?.method ?? "GET").toUpperCase();

  if (method === "GET" || method === "HEAD") return true;
  if (method === "DELETE" || method === "PUT") return true;
  if (endpoint.includes("/auth/login")) return true;
  if (endpoint.includes("/authorization/context")) return true;

  return false;
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

async function executeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
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
  try {
    return await executeRequest<T>(endpoint, options);
  } catch (error) {
    const canRetry = shouldRetryRequest(endpoint, options);
    const networkLikeFailure =
      error instanceof TypeError ||
      (error instanceof DOMException && error.name === "AbortError");

    if (canRetry && networkLikeFailure) {
      await sleep(RETRY_DELAY_MS);

      try {
        return await executeRequest<T>(endpoint, options);
      } catch (retryError) {
        if (retryError instanceof DOMException && retryError.name === "AbortError") {
          throw new Error(
            "API tidak merespons setelah dua percobaan. Backend Render kemungkinan masih bangun dari sleep. Tunggu 10-20 detik lalu coba lagi."
          );
        }

        if (retryError instanceof TypeError) {
          throw new Error(
            "Koneksi ke backend gagal dijangkau. Pastikan URL API Vercel benar dan CORS_ORIGINS di Render sudah mengizinkan domain frontend."
          );
        }

        throw retryError;
      }
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "API tidak merespons dalam 70 detik. Jika backend Render baru bangun dari sleep, coba tunggu sebentar lalu ulangi."
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Koneksi ke backend gagal dijangkau. Pastikan URL API Vercel benar dan CORS_ORIGINS di Render sudah mengizinkan domain frontend."
      );
    }

    throw error;
  }
}
