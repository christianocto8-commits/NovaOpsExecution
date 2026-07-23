"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, MoreHorizontal, Wrench } from "lucide-react";

import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { useLanguage } from "@/shared/i18n";

const allTabs = [
  { id: "tasks", href: "/dashboard/tasks", icon: ClipboardCheck, labelKey: "operator.tab.tasks" },
  { id: "forms", href: "/dashboard/forms", icon: FileText, labelKey: "operator.tab.forms" },
  { id: "capa", href: "/dashboard/corrective-actions", icon: Wrench, labelKey: "operator.tab.capa" },
  { id: "more", href: "/dashboard/operator", icon: MoreHorizontal, labelKey: "operator.tab.more" },
] as const;

type OperatorSectionTabsProps = {
  sticky?: boolean;
};

export function OperatorSectionTabs({ sticky = true }: OperatorSectionTabsProps) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const capaEnabled = isCapaEnabled(settings);
  const tabs = capaEnabled ? allTabs : allTabs.filter((tab) => tab.id !== "capa");

  function isActive(href: string, id: string) {
    if (id === "more") {
      return pathname === "/dashboard/operator" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <nav
      className={[
        "z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl",
        sticky ? "sticky top-[57px] sm:top-[65px]" : "",
      ].join(" ")}
      aria-label={t("operator.tab.navLabel")}
    >
      <div className="flex gap-1 overflow-x-auto px-2 py-2 sm:px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.id);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={[
                "flex min-h-[44px] min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-bold transition sm:min-h-[48px] sm:text-xs",
                active
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
            >
              <Icon className="size-5" />
              <span>{t(tab.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
