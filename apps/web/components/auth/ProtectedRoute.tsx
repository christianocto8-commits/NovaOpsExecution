"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const publicRoutes = ["/login"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAuthenticated } = useAuth();

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [loading, isAuthenticated, isPublicRoute, pathname, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8]">
        <p className="text-sm text-gray-500">Loading session...</p>
      </main>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  if (isAuthenticated && pathname === "/login") {
    return null;
  }

  return <>{children}</>;
}