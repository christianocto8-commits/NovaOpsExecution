"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardCheck, FileText, Home } from "lucide-react";

import { useLanguage } from "@/shared/i18n";

const operatorNavItems = [
  { href: "/dashboard/operator", labelKey: "operator.tab.home", icon: Home, match: "exact" as const },
  { href: "/dashboard/tasks", labelKey: "operator.tab.tasks", icon: ClipboardCheck, match: "prefix" as const },
  { href: "/dashboard/forms", labelKey: "operator.tab.forms", icon: FileText, match: "prefix" as const },
  { href: "/dashboard/reports", labelKey: "operator.tab.reports", icon: BarChart3, match: "prefix" as const },
] as const;

export function OperatorBottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE8E1] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg"
      aria-label={t("operator.tab.navLabel")}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {operatorNavItems.map((item) => {
          const active =
            item.match === "exact"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={[
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-bold transition",
                  active ? "text-emerald-700" : "text-slate-400",
                ].join(" ")}
              >
                <Icon className={["size-5", active ? "text-emerald-700" : "text-slate-400"].join(" ")} />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
