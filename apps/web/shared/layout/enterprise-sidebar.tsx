"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sidebarGroups, sidebarItems } from "@/shared/navigation/sidebar-items";

type EnterpriseSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function EnterpriseSidebar({
  collapsed,
  onToggle,
}: EnterpriseSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`sticky top-0 z-30 min-h-screen border-r border-slate-200 bg-white shadow-sm transition-all duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        {!collapsed ? (
          <div>
            <div className="text-sm font-black tracking-wide text-slate-950">
              NovaOPS
            </div>
            <div className="text-xs font-medium text-slate-500">
              Enterprise Console
            </div>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-sm font-black text-white shadow-sm">
            N
          </div>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex min-h-[calc(100vh-4rem)] flex-col justify-between p-3">
        <div className="space-y-5">
          {sidebarGroups.map((group) => {
            const items = sidebarItems.filter((item) => item.group === group);

            return (
              <div key={group}>
                {!collapsed && (
                  <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {group}
                  </div>
                )}

                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          active
                            ? "bg-emerald-50 text-emerald-700 shadow-sm"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                            active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        {!collapsed && (
                          <span className="ml-3 flex-1 truncate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!collapsed && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold text-slate-800">
              NovaOPS v0.6.0
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              Enterprise Operations Platform
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
