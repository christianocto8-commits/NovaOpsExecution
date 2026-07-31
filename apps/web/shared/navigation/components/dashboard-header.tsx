"use client";

import { useContext, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";

import { NotificationHeaderButton } from "@/features/notifications/components/notification-header-button";
import { AnnouncementHeaderButton } from "@/features/announcements/components/announcement-header-button";

import { AuthContext } from "@/providers/AuthProvider";
import { useLanguage } from "@/shared/i18n";
import { CurrentWorkspace } from "@/shared/navigation";
import { CommandTrigger } from "@/shared/command-center/components/command-trigger";
import { OfflineSyncBadge } from "@/shared/navigation/components/offline-sync-badge";

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
  const isOutletWorkspace = workspace.mode === "outlet";

  return (
    <header className="sticky top-0 z-30 border-b border-[#DDE8E1] bg-white/90 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className={[
              "flex size-11 shrink-0 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC] lg:hidden",
              isOutletWorkspace ? "opacity-70" : "",
            ].join(" ")}
          >
            <Menu className="size-5" />
            <span className="sr-only">{t("header.openMenu")}</span>
          </button>

          {showBackButton ? (
            <button
              type="button"
              onClick={() => router.push(parentRoute)}
              className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] shadow-sm transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC] sm:flex"
            >
              <ArrowLeft className="size-5" />
              <span className="sr-only">{t("header.back")}</span>
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          {!isOutletWorkspace ? (
            <>
              <CommandTrigger />
              <CommandTrigger compact />
            </>
          ) : null}
          <OfflineSyncBadge />
          <AnnouncementHeaderButton />
          <NotificationHeaderButton />

          <div className="hidden rounded-full border border-[#DDE8E1] bg-[#F7FAF8] px-4 py-2 text-xs font-semibold text-[#3D6B49] md:block">
            {workspace.roleLabel}
          </div>

          <button
            type="button"
            onClick={() => auth?.logout()}
            className="rounded-full border border-red-100 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 sm:px-4 sm:text-xs"
          >
            {t("common.logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
