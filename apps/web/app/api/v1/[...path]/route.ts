import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "novaops_access";
const REFRESH_COOKIE = "novaops_refresh";
const AUTH_RESPONSE_PATHS = new Set(["auth/login", "auth/verify-otp"]);

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

  const targetPath = `/api/v1/${pathSegments.join("/")}`;
  const targetUrl = new URL(targetPath, API_BASE);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  if (!headers.has("authorization")) {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    if (accessToken) {
      if (!isSameOriginRequest(request)) {
        return NextResponse.json({ detail: "Cross-origin request rejected" }, { status: 403 });
      }
      headers.set("authorization", `Bearer ${accessToken}`);
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(targetUrl, init);
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
  return !origin || origin === request.nextUrl.origin;
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
