export const DEFAULT_PRODUCTION_API_URL = "http://103.247.10.145";

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isBrowserProduction() {
  return (
    typeof window !== "undefined" && !isLocalHostname(window.location.hostname)
  );
}

export function resolveApiUrl() {
  const configured = normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      ""
  );

  if (configured) {
    return configured;
  }

  if (isBrowserProduction()) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return "http://localhost:8000";
}

export function resolveApiDisplayUrl() {
  return resolveApiUrl();
}

export function buildApiUrl(endpoint: string) {
  // Browser on HTTPS (Vercel) cannot call HTTP VPS directly (mixed content).
  // Route through same-origin /api/backend proxy configured in next.config.ts.
  if (isBrowserProduction()) {
    return `/api/backend${endpoint.replace(/^\/api/, "")}`;
  }

  return `${resolveApiUrl()}${endpoint}`;
}
