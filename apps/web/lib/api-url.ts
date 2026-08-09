export const DEFAULT_PRODUCTION_API_URL = "http://103.247.10.145";

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "").replace("://localhost", "://127.0.0.1");
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function isBrowserLocalDev() {
  return typeof window !== "undefined" && isLocalHostname(window.location.hostname);
}

function isBrowserProduction() {
  return typeof window !== "undefined" && !isBrowserLocalDev();
}

function shouldUseRelativeApiMode() {
  return process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";
}

function configuredApiUrl() {
  return normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
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
  return shouldUseRelativeApiMode() || isSameHostApi();
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
  // Explicit API URL (set at build time for the Android APK) always wins.
  // In a Capacitor webview the hostname is "localhost", which would otherwise
  // be misdetected as local dev and point at http://localhost:8000.
  const explicitlyConfigured = configuredApiUrl();
  if (explicitlyConfigured) {
    return explicitlyConfigured;
  }

  if (shouldUseRelativeApi()) {
    return "";
  }

  if (isBrowserProduction()) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return "http://localhost:8000";
}

export function isLocalDevEnvironment() {
  // Explicit API URL (Android APK build) means we are not in local dev, even
  // though the Capacitor webview reports hostname "localhost".
  if (configuredApiUrl()) return false;
  return isBrowserLocalDev() || isLocalSplitDev();
}

export function resolveApiDisplayUrl() {
  const explicitlyConfigured = configuredApiUrl();
  if (explicitlyConfigured) {
    return explicitlyConfigured;
  }

  if (typeof window !== "undefined" && shouldUseRelativeApi()) {
    return `${window.location.origin} → API ${configuredApiUrl() || "http://127.0.0.1:8000"}`;
  }

  const resolved = resolveApiUrl();
  return resolved || DEFAULT_PRODUCTION_API_URL;
}

export function buildApiUrl(endpoint: string) {
  // Explicit API URL (set at build time for the Android APK) always wins,
  // matching resolveApiUrl(). In a Capacitor webview the hostname is
  // "localhost", which must NOT be misdetected as local dev (that would
  // produce a relative URL with no backend behind it).
  const explicitlyConfigured = configuredApiUrl();
  if (explicitlyConfigured) {
    return `${explicitlyConfigured}${endpoint}`;
  }

  if (shouldUseRelativeApi()) {
    return endpoint;
  }

  if (isBrowserProduction()) {
    return `/api/backend${endpoint.replace(/^\/api/, "")}`;
  }

  const apiBase = resolveApiUrl() || "http://127.0.0.1:8000";
  return `${apiBase}${endpoint}`;
}
