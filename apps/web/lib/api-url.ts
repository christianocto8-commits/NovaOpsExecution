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

function isHostedFrontend(hostname: string) {
  return (
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".vercel.app.") ||
    hostname.includes("nova-ops")
  );
}

export function buildRequestUrl(apiBase: string, endpoint: string) {
  if (!apiBase) {
    return `/api/backend${endpoint.replace(/^\/api/, "")}`;
  }

  return `${apiBase}${endpoint}`;
}

export function resolveApiUrl() {
  const configured = normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      ""
  );

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (isHostedFrontend(hostname)) {
      // Same-origin proxy via Next.js rewrites — avoids browser CORS failures.
      return "";
    }
  }

  if (configured && !isLocalApiUrl(configured)) {
    return configured;
  }

  return configured || "http://localhost:8000";
}

export function resolveApiUrlLabel() {
  const resolved = resolveApiUrl();
  return resolved || DEFAULT_PRODUCTION_API_URL;
}
