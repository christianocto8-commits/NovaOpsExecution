import type { NextConfig } from "next";

const useRelativeApi = process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";

const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "http://103.247.10.145")
).replace(/\/+$/, "");

const isLocalApiTarget =
  API_PROXY_TARGET.includes("localhost") ||
  API_PROXY_TARGET.includes("127.0.0.1");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    if (useRelativeApi) {
      return [];
    }

    const rewrites = [
      {
        source: "/api/backend/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];

    // Local dev fallback: proxy /api/v1 when browser still hits same-origin paths.
    if (isLocalApiTarget) {
      rewrites.unshift({
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
