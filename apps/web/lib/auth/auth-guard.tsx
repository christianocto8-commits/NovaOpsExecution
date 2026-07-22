"use client";

import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/providers/AuthProvider";

type AuthGuardProps = {
  children: React.ReactNode;
};

function hasStoredToken() {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("novaops_token"));
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("AuthGuard must be used inside AuthProvider");
  }

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace("/login");
    }
  }, [auth.status, router]);

  useEffect(() => {
    if (auth.status !== "idle" && auth.status !== "loading") {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!hasStoredToken()) {
        router.replace("/login");
      }
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [auth.status, router]);

  if (auth.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8]">
        <div className="rounded-2xl border border-[#DDE8E1] bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-medium text-[#274733]">Loading NovaOps Workspace...</p>
        </div>
      </main>
    );
  }

  if (!auth.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
