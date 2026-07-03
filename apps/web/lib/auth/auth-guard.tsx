"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("novaops_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8]">
        <div className="rounded-2xl border border-[#DDE8E1] bg-white px-6 py-5 shadow-sm">
          <p className="text-sm font-medium text-[#274733]">
            Loading NovaOps Workspace...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}