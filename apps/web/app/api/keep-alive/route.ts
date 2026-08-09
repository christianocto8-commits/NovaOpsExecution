import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_TARGET = (
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8000"
    : process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true"
      ? "http://127.0.0.1:8000"
      : "http://103.247.10.145")
).replace(/\/+$/, "");

export async function GET() {
  try {
    const response = await fetch(`${API_TARGET}/api/v1/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ status: "error", upstream: response.status }, { status: 502 });
    }

    const payload = await response.json();
    return NextResponse.json({ status: "ok", upstream: payload });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 502 });
  }
}
