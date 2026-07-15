"use client";

import { useContext } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { AuthContext } from "@/providers/AuthProvider";
import { useLanguage } from "@/shared/i18n";
import { CurrentWorkspace } from "@/shared/navigation";

type DashboardHeaderProps = {
  workspace: CurrentWorkspace;
};

export function DashboardHeader({ workspace }: DashboardHeaderProps) {
  const auth = useContext(AuthContext);
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 border-b border-[#DDE8E1] bg-white/85 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3D6B49]">
            {workspace.mode === "outlet"
              ? t("header.outletOperations")
              : t("header.operationsCommandCenter")}
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#274733]">
            {workspace.mode === "outlet"
              ? (workspace.outletName ?? t("header.outletWorkspace"))
              : t("header.workspace")}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/notifications"
            title={t("navigation.notifications")}
            className="flex size-10 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
          >
            <Bell className="size-4" />
            <span className="sr-only">{t("navigation.notifications")}</span>
          </Link>

          <div className="hidden rounded-full border border-[#DDE8E1] bg-[#F7FAF8] px-4 py-2 text-xs font-semibold text-[#3D6B49] sm:block">
            {workspace.roleLabel}
          </div>

          <button
            type="button"
            onClick={() => auth?.logout()}
            className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            {t("common.logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
