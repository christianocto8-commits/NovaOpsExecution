"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/shared/i18n";
import { getNavigationForPermissions, type NavigationItem } from "@/shared/navigation";
import { CurrentWorkspace } from "../role-config";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarFooter } from "./sidebar-footer";

type EnterpriseSidebarProps = {
  collapsed: boolean;
  workspace: CurrentWorkspace;
  mobileOpen: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
};

function groupNavigation(items: NavigationItem[]) {
  return items.reduce<Record<NavigationItem["section"], NavigationItem[]>>(
    (groups, item) => {
      groups[item.section] = [...(groups[item.section] ?? []), item];
      return groups;
    },
    {
      sop: [],
      analytics: [],
      administration: [],
      configuration: [],
    }
  );
}

function SidebarNavigation({
  collapsed,
  workspace,
  onItemClick,
}: {
  collapsed: boolean;
  workspace: CurrentWorkspace;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();
  const { can } = useAuth();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const groupedItems = groupNavigation(
    getNavigationForPermissions(can, workspace, {
      capaEnabled: isCapaEnabled(settings),
    })
  );

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {Object.entries(groupedItems).map(([section, items]) => {
          if (items.length === 0) return null;

          return (
            <div key={section} className="mb-5 last:mb-0">
              {!collapsed ? (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t(`section.${section}`)}
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
                      onClick={onItemClick}
                      title={collapsed ? t(`navigation.${item.id}`) : undefined}
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

                      {!collapsed ? <span>{t(`navigation.${item.id}`)}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <SidebarFooter collapsed={collapsed} workspace={workspace} />
    </>
  );
}

function MobileSidebarHeader({ onCloseMobile }: { onCloseMobile: () => void }) {
  return (
    <div className="border-b border-[#DDE8E1] px-4 py-5">
      <div className="rounded-3xl bg-[#274733] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#EAF1EC]">
              NovaOps
            </p>
            <h1 className="mt-2 text-xl font-bold">Enterprise</h1>
            <p className="mt-2 text-xs leading-5 text-[#DDE8E1]">
              Multi-outlet operations command center.
            </p>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function EnterpriseSidebar({
  collapsed,
  workspace,
  mobileOpen,
  onToggle,
  onCloseMobile,
}: EnterpriseSidebarProps) {
  return (
    <>
      <aside
        className={[
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-[#DDE8E1] bg-white/95 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out lg:flex lg:flex-col",
          collapsed ? "w-24" : "w-72",
        ].join(" ")}
      >
        <SidebarBrand collapsed={collapsed} onToggle={onToggle} />
        <SidebarNavigation collapsed={collapsed} workspace={workspace} />
      </aside>

      <div
        className={[
          "fixed inset-0 z-[70] bg-slate-950/40 transition lg:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onCloseMobile}
          className="absolute inset-0"
        />

        <aside
          className={[
            "relative flex h-full w-[88vw] max-w-[320px] flex-col border-r border-[#DDE8E1] bg-white shadow-2xl transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <MobileSidebarHeader onCloseMobile={onCloseMobile} />
          <SidebarNavigation collapsed={false} workspace={workspace} onItemClick={onCloseMobile} />
        </aside>
      </div>
    </>
  );
}
