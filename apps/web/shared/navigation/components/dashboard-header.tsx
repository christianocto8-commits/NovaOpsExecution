"use client";

import { useContext } from "react";

import { AuthContext } from "@/providers/AuthProvider";
import {
  CurrentWorkspace,
  NovaRole,
  setStoredWorkspaceRole,
  workspaceOptions,
} from "@/shared/navigation";

type DashboardHeaderProps = {
  workspace: CurrentWorkspace;
};

export function DashboardHeader({ workspace }: DashboardHeaderProps) {
  const auth = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-30 border-b border-[#DDE8E1] bg-white/85 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D6B49]">
            {workspace.mode === "outlet" ? "Outlet Operations" : "Operations Command Center"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#274733]">
            {workspace.mode === "outlet"
              ? (workspace.outletName ?? "Outlet Workspace")
              : "NovaOps Workspace"}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={workspace.role}
            onChange={(event) => setStoredWorkspaceRole(event.target.value as NovaRole)}
            className="rounded-full border border-[#DDE8E1] bg-[#F7FAF8] px-4 py-2 text-xs font-semibold text-[#3D6B49] outline-none transition focus:border-[#3D6B49] focus:ring-2 focus:ring-emerald-100"
            title="Development role switcher"
          >
            {workspaceOptions.map((option) => (
              <option key={option.role} value={option.role}>
                {option.roleLabel}
              </option>
            ))}
          </select>

          <div className="hidden rounded-full border border-[#DDE8E1] bg-[#F7FAF8] px-4 py-2 text-xs font-semibold text-[#3D6B49] sm:block">
            {workspace.roleLabel}
          </div>

          <button
            type="button"
            onClick={() => auth?.logout()}
            className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
