"use client";

import { useEffect, useState } from "react";

import { getMe, login } from "@/services/auth.service";
import type { NovaRole } from "@/shared/navigation/role-config";
import { setStoredWorkspaceRole } from "@/shared/navigation/workspace-store";

const REMEMBER_KEY = "novaops_remember_identifier";

function storeOutletContext(outletAccess: Awaited<ReturnType<typeof getMe>>["outlet_access"]) {
  localStorage.removeItem("novaops_outlet_id");
  localStorage.removeItem("current_outlet_id");
  localStorage.removeItem("outlet_id");

  const preferredOutletId =
    outletAccess.scope === "single" ? (outletAccess.outlet_id ?? outletAccess.outlet_ids[0]) : null;

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
  };
}

function getWorkspaceRoleFromSlug(roleSlug: string): NovaRole {
  if (roleSlug === "area_manager") return "AREA_MANAGER";
  if (roleSlug === "outlet") return "OUTLET";
  return "OWNER_ADMIN";
}

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const rememberedIdentifier = localStorage.getItem(REMEMBER_KEY);

    if (rememberedIdentifier) {
      setIdentifier(rememberedIdentifier);
      setRememberMe(true);
    }
  }, []);

  async function handleLogin() {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const data = await login({
        identifier: identifier.trim(),
        password,
      });

      localStorage.setItem("novaops_token", data.access_token);
      localStorage.setItem("novaops_refresh_token", data.refresh_token);

      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, identifier.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      const currentUser = await getMe();
      storeOutletContext(currentUser.outlet_access);
      setStoredWorkspaceRole(
        getWorkspaceRoleFromSlug(currentUser.role.slug),
        getWorkspaceOutletContext(currentUser.outlet_access)
      );

      setMessage("Login success. Redirecting...");
      window.location.assign("/dashboard");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Unable to connect to API");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[#DDE8E1] bg-white p-10 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#3D6B49]">
            NOVAOPS ENTERPRISE
          </p>

          <h1 className="mt-3 text-5xl font-bold text-[#1E1E1E]">Sign in</h1>

          <p className="mt-3 text-sm text-slate-500">Multi Outlet Operations Platform</p>
        </div>

        <div className="space-y-5">
          <input
            className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm outline-none focus:border-[#3D6B49]"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Username or email"
            autoComplete="username"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-2xl border border-slate-200 px-5 py-4 pr-24 text-sm outline-none focus:border-[#3D6B49]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleLogin();
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3D6B49]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => {
                const checked = event.target.checked;
                setRememberMe(checked);

                if (!checked) {
                  localStorage.removeItem(REMEMBER_KEY);
                }
              }}
              className="h-4 w-4 rounded border-slate-300 accent-[#3D6B49]"
            />
            Remember username
          </label>

          <button
            type="button"
            disabled={loading || !identifier.trim() || !password.trim()}
            onClick={() => void handleLogin()}
            className="w-full rounded-2xl bg-[#274733] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1F3A2A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          {message && (
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
