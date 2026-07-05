"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationForRole, navigationSectionLabels, NavigationItem } from "@/shared/navigation";
import { CurrentWorkspace } from "../role-config";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarFooter } from "./sidebar-footer";

type EnterpriseSidebarProps = {
  collapsed: boolean;
  workspace: CurrentWorkspace;
  onToggle: () => void;
};

function groupNavigation(items: NavigationItem[]) {
  return items.reduce<Record<NavigationItem["section"], NavigationItem[]>>(
    (groups, item) => {
      groups[item.section] = [...(groups[item.section] ?? []), item];
      return groups;
    },
    {
      enterprise: [],
      operations: [],
      administration: [],
      configuration: [],
    }
  );
}

export function EnterpriseSidebar({ collapsed, workspace, onToggle }: EnterpriseSidebarProps) {
  const pathname = usePathname();
  const groupedItems = groupNavigation(getNavigationForRole(workspace.role));

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-40 hidden h-screen border-r border-[#DDE8E1] bg-white/95 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out lg:flex lg:flex-col",
        collapsed ? "w-24" : "w-72",
      ].join(" ")}
    >
      <SidebarBrand collapsed={collapsed} onToggle={onToggle} />

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {Object.entries(groupedItems).map(([section, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={section} className="mb-5 last:mb-0">
              {!collapsed ? (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {navigationSectionLabels[section as NavigationItem["section"]]}
                </p>
              ) : null}

              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={[
                        "group flex items-center rounded-2xl text-sm font-semibold transition",
                        collapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
                        active
                          ? "bg-[#EAF1EC] text-[#274733] shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-[#274733]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-9 w-9 items-center justify-center rounded-xl transition",
                          active
                            ? "bg-white text-[#3D6B49]"
                            : "bg-slate-100 text-slate-400 group-hover:text-[#3D6B49]",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <SidebarFooter collapsed={collapsed} workspace={workspace} />
    </aside>
  );
}
