"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      className={`sticky top-0 min-h-screen border-r border-slate-200 bg-white transition-all duration-300 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        {!collapsed && (
          <div>
            <div className="text-sm font-black tracking-wide text-slate-900">
              NovaOPS
            </div>
            <div className="text-xs text-slate-500">Enterprise Console</div>
          </div>
        )}

        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-sm font-black text-white">
            N
          </div>
        )}

        <button
          onClick={onToggle}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex min-h-[calc(100vh-4rem)] flex-col justify-between p-3">
        <div className="space-y-5">
          {sidebarGroups.map((group) => {
            const items = sidebarItems.filter((item) => item.group === group);

            return (
              <div key={group}>
                {!collapsed && (
                  <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group}
                  </div>
                )}

                <div className="space-y-1">
                  {items.map((item) => {
                    const active =
                      item.href === "/dashboard"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                            active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500 group-hover:text-slate-700"
                          }`}
                        >
                          {item.label.slice(0, 1)}
                        </span>

                        {!collapsed && (
                          <span className="ml-3 flex-1 truncate">{item.label}</span>
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
            <div className="text-xs font-semibold text-slate-700">
              NovaOPS v0.5.5
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Enterprise Operations Platform
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}