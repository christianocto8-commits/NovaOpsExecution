export const DEFAULT_PRODUCTION_API_URL = "http://103.247.10.145";

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "").replace("://localhost", "://127.0.0.1");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isBrowserLocalDev() {
  return (
    typeof window !== "undefined" && isLocalHostname(window.location.hostname)
  );
}

function isBrowserProduction() {
  return typeof window !== "undefined" && !isBrowserLocalDev();
}

function useRelativeApiMode() {
  return process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";
}

function configuredApiUrl() {
  return normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      ""
  );
}

/** Frontend :3000 + API :8000 on localhost — must not use same-origin relative URLs. */
function isLocalSplitDev() {
  if (typeof window === "undefined") return false;
  if (!isLocalHostname(window.location.hostname)) return false;

  const configured = configuredApiUrl();
  const apiBase = configured || "http://localhost:8000";

  try {
    return new URL(apiBase).origin !== window.location.origin;
  } catch {
    return true;
  }
}

function shouldUseRelativeApi() {
  if (isLocalSplitDev()) return true;
  return useRelativeApiMode() || isSameHostApi();
}

function isSameHostApi() {
  if (typeof window === "undefined") return false;

  const configured = configuredApiUrl();

  if (!configured) {
    return isBrowserProduction();
  }

  try {
    return new URL(configured).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function resolveApiUrl() {
  if (shouldUseRelativeApi()) {
    return "";
  }

  const configured = configuredApiUrl();

  if (configured) {
    return configured;
  }

  if (isBrowserProduction()) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return "http://localhost:8000";
}

export function isLocalDevEnvironment() {
  return isBrowserLocalDev() || isLocalSplitDev();
}

export function resolveApiDisplayUrl() {
  if (typeof window !== "undefined" && shouldUseRelativeApi()) {
    return `${window.location.origin} → API ${configuredApiUrl() || "http://127.0.0.1:8000"}`;
  }

  const resolved = resolveApiUrl();
  return resolved || DEFAULT_PRODUCTION_API_URL;
}

export function buildApiUrl(endpoint: string) {
  if (shouldUseRelativeApi()) {
    return endpoint;
  }

  if (isBrowserProduction()) {
    return `/api/backend${endpoint.replace(/^\/api/, "")}`;
  }

  const apiBase = resolveApiUrl() || "http://127.0.0.1:8000";
  return `${apiBase}${endpoint}`;
}
