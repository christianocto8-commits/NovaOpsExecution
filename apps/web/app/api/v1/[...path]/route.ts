import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "novaops_access";
const REFRESH_COOKIE = "novaops_refresh";
const AUTH_RESPONSE_PATHS = new Set(["auth/login", "auth/verify-otp", "auth/refresh"]);

const refreshLockByToken = new Map<
  string,
  Promise<{ access_token: string; refresh_token: string; expires_in_minutes?: number } | null>
>();

type RefreshResult = {
  access_token: string;
  refresh_token: string;
  expires_in_minutes?: number;
} | null;

function resolveApiBase() {
  const raw =
    process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

  return raw.trim().replace(/\/+$/, "").replace("://localhost", "://127.0.0.1");
}

const API_BASE = resolveApiBase();

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const relativePath = pathSegments.join("/");
  if (relativePath === "auth/browser-session") {
    return handleBrowserSession(request);
  }
  if (relativePath === "auth/browser-session/refresh") {
    return handleBrowserSessionRefresh(request);
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Cross-origin request rejected" }, { status: 403 });
  }

  const targetPath = `/api/v1/${pathSegments.join("/")}`;
  const targetUrl = new URL(targetPath, API_BASE);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (!headers.has("authorization") && !AUTH_RESPONSE_PATHS.has(relativePath)) {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
    init.body = body;
  }

  try {
    let upstream = await fetch(targetUrl, init);
    let rotatedCookies:
      | {
          access_token: string;
          refresh_token: string;
          expires_in_minutes?: number;
        }
      | undefined;

    if (
      upstream.status === 401 &&
      !relativePath.startsWith("auth/") &&
      request.cookies.get(REFRESH_COOKIE)?.value
    ) {
      const refreshed = await refreshUpstreamTokens(request);
      if (refreshed) {
        rotatedCookies = refreshed;
        headers.set("authorization", `Bearer ${refreshed.access_token}`);
        const retryInit: RequestInit = {
          method: request.method,
          headers,
          redirect: "manual",
        };
        if (body) {
          retryInit.body = body;
        }
        upstream = await fetch(targetUrl, retryInit);
      }
    }

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    let authPayload:
      | {
          access_token?: string | null;
          refresh_token?: string | null;
          expires_in_minutes?: number;
        }
      | undefined;
    if (upstream.ok && AUTH_RESPONSE_PATHS.has(relativePath)) {
      authPayload = await upstream.clone().json();
    }
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
    if (authPayload?.access_token && authPayload.refresh_token) {
      setAuthCookies(
        response,
        authPayload.access_token,
        authPayload.refresh_token,
        authPayload.expires_in_minutes
      );
    } else if (rotatedCookies) {
      setAuthCookies(
        response,
        rotatedCookies.access_token,
        rotatedCookies.refresh_token,
        rotatedCookies.expires_in_minutes
      );
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream API request failed";

    return NextResponse.json(
      {
        detail: `Proxy ke backend gagal (${API_BASE}): ${message}`,
      },
      { status: 502 }
    );
  }
}

function isSameOriginRequest(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return true;
  }
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
  const publicOrigin = host ? `${protocol}://${host}` : null;

  return origin === request.nextUrl.origin || origin === publicOrigin;
}

function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  expiresInMinutes = 30
) {
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    priority: "high" as const,
  };
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    ...common,
    maxAge: Math.max(60, expiresInMinutes * 60),
  });
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    ...common,
    maxAge: 30 * 24 * 60 * 60,
  });
}

async function doRefreshUpstreamTokens(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const upstream = await fetch(new URL("/api/v1/auth/refresh", API_BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => null);

  if (!upstream?.ok) return null;

  const payload = (await upstream.json()) as {
    access_token?: string | null;
    refresh_token?: string | null;
    expires_in_minutes?: number;
  };
  if (!payload.access_token || !payload.refresh_token) return null;

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in_minutes: payload.expires_in_minutes,
  };
}

async function refreshUpstreamTokens(request: NextRequest): Promise<RefreshResult> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const existing = refreshLockByToken.get(refreshToken);
  if (existing) {
    return existing;
  }

  const pending = doRefreshUpstreamTokens(request);
  refreshLockByToken.set(refreshToken, pending);
  try {
    return await pending;
  } finally {
    if (refreshLockByToken.get(refreshToken) === pending) {
      refreshLockByToken.delete(refreshToken);
    }
  }
}

async function handleBrowserSessionRefresh(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Cross-origin request rejected" }, { status: 403 });
  }
  if (request.method !== "POST") {
    return NextResponse.json({ detail: "Method not allowed" }, { status: 405 });
  }

  const refreshed = await refreshUpstreamTokens(request);
  if (!refreshed) {
    const response = NextResponse.json({ detail: "Refresh session expired" }, { status: 401 });
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setAuthCookies(
    response,
    refreshed.access_token,
    refreshed.refresh_token,
    refreshed.expires_in_minutes
  );
  return response;
}

async function handleBrowserSession(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ detail: "Cross-origin request rejected" }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  if (request.method === "DELETE") {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    if (accessToken) {
      await fetch(new URL("/api/v1/auth/logout", API_BASE), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => null);
    }
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }
  if (request.method !== "POST") {
    return NextResponse.json({ detail: "Method not allowed" }, { status: 405 });
  }
  const payload = (await request.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!payload.access_token || !payload.refresh_token) {
    return NextResponse.json({ detail: "Token is required" }, { status: 400 });
  }
  setAuthCookies(response, payload.access_token, payload.refresh_token);
  return response;
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
