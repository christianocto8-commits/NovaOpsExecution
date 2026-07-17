export const DEFAULT_PRODUCTION_API_URL = "https://novaops-api.onrender.com";

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isLocalApiUrl(value: string) {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isLocalFrontend(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function buildRequestUrl(apiBase: string, endpoint: string) {
  if (!apiBase) {
    return `/api/backend${endpoint.replace(/^\/api/, "")}`;
  }

  return `${apiBase}${endpoint}`;
}

export function resolveDirectApiUrl() {
  const configured = normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      ""
  );

  if (configured && !isLocalApiUrl(configured)) {
    return configured;
  }

  if (typeof window !== "undefined" && !isLocalFrontend(window.location.hostname)) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return configured || "http://localhost:8000";
}

export function resolveProxyApiUrl() {
  if (typeof window === "undefined") return null;
  if (isLocalFrontend(window.location.hostname)) return null;
  return "";
}

export function getApiRequestCandidates(endpoint: string) {
  const directBase = resolveDirectApiUrl();
  const proxyBase = resolveProxyApiUrl();
  const candidates = [buildRequestUrl(directBase, endpoint)];

  if (proxyBase !== null) {
    const proxyUrl = buildRequestUrl(proxyBase, endpoint);
    if (!candidates.includes(proxyUrl)) {
      candidates.push(proxyUrl);
    }
  }

  return candidates;
}

export function resolveApiUrlLabel() {
  return resolveDirectApiUrl();
}

let wakePromise: Promise<void> | null = null;

export async function wakeBackend() {
  if (typeof window === "undefined") return;

  if (!wakePromise) {
    wakePromise = (async () => {
      const healthEndpoint = "/api/v1/health";
      const candidates = getApiRequestCandidates(healthEndpoint);

      for (const url of candidates) {
        try {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 90000);

          await fetch(url, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          });

          window.clearTimeout(timeout);
          return;
        } catch {
          // Try the next transport if Render is still waking up.
        }
      }
    })().finally(() => {
      wakePromise = null;
    });
  }

  await wakePromise;
}
