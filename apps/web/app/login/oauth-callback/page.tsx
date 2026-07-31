"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getMe } from "@/services/auth.service";
import {
  establishBrowserSession,
  storeAuthenticatedSession,
  usesNativeTokenStorage,
} from "@/lib/auth/browser-session";
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
  if (roleSlug === "regional_manager") return "REGIONAL_MANAGER";
  if (roleSlug === "district_manager") return "DISTRICT_MANAGER";
  if (roleSlug === "area_manager") return "AREA_MANAGER";
  if (roleSlug === "outlet") return "OUTLET";
  if (roleSlug === "finance") return "FINANCE";
  return "OWNER_ADMIN";
}

function getPostLoginDestination(roleSlug: string) {
  return roleSlug === "finance" ? "/dashboard/finance-handoff" : "/dashboard";
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
        if (!usesNativeTokenStorage()) {
          await establishBrowserSession(token, refresh);
        }
        storeAuthenticatedSession(token, refresh);

        const currentUser = await getMe();
        storeOutletContext(currentUser.outlet_access);
        setStoredWorkspaceRole(
          getWorkspaceRoleFromSlug(currentUser.role.slug),
          getWorkspaceOutletContext(currentUser.outlet_access)
        );

        router.replace(getPostLoginDestination(currentUser.role.slug));
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
