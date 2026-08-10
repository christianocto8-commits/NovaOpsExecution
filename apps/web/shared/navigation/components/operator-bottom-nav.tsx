"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { BarChart3, ClipboardCheck, FileText, Home, MoreHorizontal } from "lucide-react";

import { useLanguage } from "@/shared/i18n";
import {
  getOutletOverlaySnapshot,
  getServerOutletOverlaySnapshot,
  subscribeOutletOverlay,
} from "@/shared/navigation/outlet-overlay";

const operatorNavItems = [
  {
    href: "/dashboard/operator",
    labelKey: "operator.tab.home",
    icon: Home,
    match: "exact" as const,
  },
  {
    href: "/dashboard/tasks",
    labelKey: "operator.tab.tasks",
    icon: ClipboardCheck,
    match: "prefix" as const,
  },
  {
    href: "/dashboard/forms",
    labelKey: "operator.tab.forms",
    icon: FileText,
    match: "prefix" as const,
  },
  {
    href: "/dashboard/reports",
    labelKey: "operator.tab.reports",
    icon: BarChart3,
    match: "prefix" as const,
  },
  {
    href: "/dashboard/more",
    labelKey: "operator.tab.more",
    icon: MoreHorizontal,
    match: "more" as const,
  },
] as const;

const morePaths = [
  "/dashboard/more",
  "/dashboard/drafts",
  "/dashboard/incidents",
  "/dashboard/corrective-actions",
  "/dashboard/training",
  "/dashboard/notifications",
  "/dashboard/announcements",
  "/dashboard/settings",
];

export function OperatorBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const overlayOpen = useSyncExternalStore(
    subscribeOutletOverlay,
    getOutletOverlaySnapshot,
    getServerOutletOverlaySnapshot
  );

  if (overlayOpen) {
    return null;
  }

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-full border border-slate-200/80 bg-white/90 p-1.5 shadow-2xl backdrop-blur-xl transition-all duration-200 sm:left-1/2 sm:-translate-x-1/2 sm:w-full"
      aria-label={t("operator.tab.navLabel")}
    >
      <ul className="flex items-center justify-around">
        {operatorNavItems.map((item) => {
          const active =
            item.match === "exact"
              ? pathname === item.href
              : item.match === "more"
                ? morePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-full py-1.5 text-[10px] font-bold transition-all duration-200 sm:text-[11px]",
                  active
                    ? "bg-emerald-500/10 text-emerald-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "size-4 transition-transform duration-200",
                    active ? "scale-110 text-emerald-700" : "text-slate-400",
                  ].join(" ")}
                />
                <span className={active ? "font-extrabold text-emerald-800" : ""}>
                  {t(item.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
