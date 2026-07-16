"use client";

import { useContext, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Menu } from "lucide-react";

import { AuthContext } from "@/providers/AuthProvider";
import { useLanguage } from "@/shared/i18n";
import { CurrentWorkspace } from "@/shared/navigation";

type DashboardHeaderProps = {
  workspace: CurrentWorkspace;
  onOpenMobileMenu: () => void;
};

function getParentRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return "/dashboard";
  }

  if (segments.length === 2) {
    return "/dashboard";
  }

  return `/${segments.slice(0, -1).join("/")}`;
}

export function DashboardHeader({ workspace, onOpenMobileMenu }: DashboardHeaderProps) {
  const auth = useContext(AuthContext);
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const parentRoute = useMemo(() => getParentRoute(pathname), [pathname]);
  const showBackButton = pathname !== "/dashboard";

  return (
    <header className="sticky top-0 z-30 border-b border-[#DDE8E1] bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC] lg:hidden"
          >
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </button>

          {showBackButton ? (
            <button
              type="button"
              onClick={() => router.push(parentRoute)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
            >
              <ArrowLeft className="size-5" />
              <span className="sr-only">Back</span>
            </button>
          ) : null}

          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D6B49] sm:text-xs">
              {workspace.mode === "outlet"
                ? t("header.outletOperations")
                : t("header.operationsCommandCenter")}
            </p>
            <h2 className="mt-1 truncate text-base font-bold text-[#274733] sm:text-lg">
              {workspace.mode === "outlet"
                ? (workspace.outletName ?? t("header.outletWorkspace"))
                : t("header.workspace")}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
            className="rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 sm:px-4"
          >
            {t("common.logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
