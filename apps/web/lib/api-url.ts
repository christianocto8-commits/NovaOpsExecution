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
  const candidates: string[] = [];

  // Same-origin proxy first in production — avoids CORS and uses Vercel edge rewrite
  // instead of the 10s serverless timeout on Hobby plans.
  if (proxyBase !== null) {
    candidates.push(buildRequestUrl(proxyBase, endpoint));
  }

  const directUrl = buildRequestUrl(directBase, endpoint);
  if (!candidates.includes(directUrl)) {
    candidates.push(directUrl);
  }

  return candidates;
}

export function resolveApiUrlLabel() {
  const proxyBase = resolveProxyApiUrl();
  if (proxyBase !== null) {
    return buildRequestUrl(proxyBase, "/api/v1/health").replace(/\/v1\/health$/, "");
  }

  return resolveDirectApiUrl();
}

let wakePromise: Promise<void> | null = null;

export async function wakeBackend() {
  if (typeof window === "undefined") return;

  if (!wakePromise) {
    wakePromise = (async () => {
      const healthEndpoint = "/api/v1/health";
      const candidates = getApiRequestCandidates(healthEndpoint);
      const maxAttempts = 6;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        for (const url of candidates) {
          try {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 90000);

            const response = await fetch(url, {
              method: "GET",
              cache: "no-store",
              signal: controller.signal,
            });

            window.clearTimeout(timeout);

            if (response.ok) {
              return;
            }
          } catch {
            // Try the next transport if Render is still waking up.
          }
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 5000));
        }
      }
    })().finally(() => {
      wakePromise = null;
    });
  }

  await wakePromise;
}
