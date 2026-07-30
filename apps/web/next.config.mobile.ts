import type { NextConfig } from "next";

/**
 * Mobile (Capacitor) build config — produces a fully static export in `out/`
 * so the Android app can run the outlet-only bundle offline and call the
 * production API directly (NEXT_PUBLIC_API_URL is set at build time).
 *
 * Run with: next build -c next.config.mobile.ts
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // No API proxy rewrites in the static bundle; the app calls the production
  // API by absolute URL (NEXT_PUBLIC_API_URL).
  async rewrites() {
    return [];
  },
};

export default nextConfig;
