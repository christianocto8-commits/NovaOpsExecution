import type { NextConfig } from "next";

/**
 * Mobile (Capacitor) build config — produces a fully static export in `out/`
 * so the Android app can run the outlet-only bundle offline and call the
 * production API directly (NEXT_PUBLIC_API_URL is set at build time).
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
