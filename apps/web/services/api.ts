const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 12000;

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

export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const outletId = getOutletId();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: options?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",

        ...(token ? { Authorization: `Bearer ${token}` } : {}),

        ...(outletId ? { "X-Outlet-Id": outletId } : {}),

        ...(options?.headers ?? {}),
      },
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
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("API tidak merespons. Pastikan backend NovaOps berjalan di http://localhost:8000.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}