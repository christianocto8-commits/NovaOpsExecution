"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getMe } from "@/services/auth.service";
import type { NovaRole } from "@/shared/navigation/role-config";
import { setStoredWorkspaceRole } from "@/shared/navigation/workspace-store";

function storeOutletContext(outletAccess: Awaited<ReturnType<typeof getMe>>["outlet_access"]) {
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");

  const preferredOutletId =
    outletAccess.scope === "single"
      ? outletAccess.legacy_outlet_id != null
        ? String(outletAccess.legacy_outlet_id)
        : (outletAccess.outlet_id ?? outletAccess.outlet_ids[0])
      : null;

  if (preferredOutletId) {
    localStorage.setItem("novaops_outlet_id", preferredOutletId);
  }
}

function getWorkspaceOutletContext(
  outletAccess: Awaited<ReturnType<typeof getMe>>["outlet_access"]
) {
  const preferredOutlet = outletAccess.outlets?.[0];

  return {
    outletId: outletAccess.outlet_id ?? outletAccess.outlet_ids?.[0] ?? preferredOutlet?.id,
    outletName: outletAccess.outlet_name ?? preferredOutlet?.name,
    outletCode: outletAccess.outlet_code ?? preferredOutlet?.code,
    legacyOutletId: outletAccess.legacy_outlet_id ?? undefined,
  };
}

function getWorkspaceRoleFromSlug(roleSlug: string): NovaRole {
  if (roleSlug === "area_manager") return "AREA_MANAGER";
  if (roleSlug === "outlet") return "OUTLET";
  return "OWNER_ADMIN";
}

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Menyelesaikan login Google...");

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setMessage("Token OAuth tidak ditemukan. Kembali ke halaman login.");
      return;
    }

    async function completeLogin(token: string, refresh: string) {
      try {
        localStorage.setItem("novaops_token", token);
        localStorage.setItem("novaops_refresh_token", refresh);

        const currentUser = await getMe();
        storeOutletContext(currentUser.outlet_access);
        setStoredWorkspaceRole(
          getWorkspaceRoleFromSlug(currentUser.role.slug),
          getWorkspaceOutletContext(currentUser.outlet_access)
        );

        router.replace("/dashboard");
      } catch (error) {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "Gagal menyelesaikan login Google.");
      }
    }

    void completeLogin(accessToken, refreshToken);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-6">
      <div className="rounded-3xl border border-[#DDE8E1] bg-white px-8 py-6 text-sm text-slate-600 shadow-sm">
        {message}
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-6">
          <div className="rounded-3xl border border-[#DDE8E1] bg-white px-8 py-6 text-sm text-slate-600 shadow-sm">
            Menyelesaikan login Google...
          </div>
        </main>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
