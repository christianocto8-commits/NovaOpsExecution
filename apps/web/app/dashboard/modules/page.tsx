"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  canAccessNavigationItem,
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  navigationItems,
  navigationSectionLabels,
  subscribeWorkspace,
} from "@/shared/navigation";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";

export default function ModulesPage() {
  const { can } = useAuth();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const advancedItems = navigationItems.filter(
    (item) => item.sidebar === false && canAccessNavigationItem(can, item.id, workspace)
  );
  const sections = Object.entries(navigationSectionLabels)
    .map(([section, label]) => ({
      section,
      label,
      items: advancedItems.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">NovaOps Modules</p>
        <h1 className="text-2xl font-semibold text-slate-950">More</h1>
      </div>

      {sections.map((group) => (
        <section key={group.section} className="border-t border-slate-200 pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-500">{group.label}</h2>
          <div className="mt-2 divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex min-h-14 items-center gap-3 px-3 py-3 text-slate-700 transition hover:bg-slate-50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF1EC] text-[#3D6B49]">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
