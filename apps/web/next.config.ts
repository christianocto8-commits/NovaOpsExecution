import type { NextConfig } from "next";

const API_PROXY_TARGET = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_PROXY_TARGET ??
  "https://novaops-api.onrender.com"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
