export const DEFAULT_PRODUCTION_API_URL = "https://novaops-api.onrender.com";

function normalizeApiUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function isLocalApiUrl(value: string) {
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

export function resolveApiUrl() {
  const configured = normalizeApiUrl(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      ""
  );

  if (configured && !isLocalApiUrl(configured)) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (isHostedFrontend(hostname)) {
      return DEFAULT_PRODUCTION_API_URL;
    }
  }

  return configured || "http://localhost:8000";
}
