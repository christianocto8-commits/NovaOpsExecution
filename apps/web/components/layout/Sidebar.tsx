"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { getNavigationForPermissions } from "@/shared/navigation/permission-engine";
import { navigationSectionLabels } from "@/shared/navigation/navigation-config";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, can } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const visibleMenuItems = useMemo(() => getNavigationForPermissions(can), [can]);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={[
        "flex h-screen flex-col overflow-hidden border-r bg-white py-6 shadow-sm",
        "transition-[width,padding] duration-500 ease-in-out",
        expanded ? "w-64 px-4" : "w-[76px] px-3",
      ].join(" ")}
    >
      <div className="mb-8 min-h-[52px]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF1EC] text-lg font-bold text-[#274733]">
            N
          </div>

          <div
            className={[
              "overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
              expanded ? "max-w-[180px] opacity-100" : "max-w-0 opacity-0",
            ].join(" ")}
          >
            <h1 className="text-xl font-bold text-[#274733]">NovaOps</h1>
            <p className="text-sm text-gray-500">Execution System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {Object.entries(navigationSectionLabels).map(([section, label]) => {
          const sectionItems = visibleMenuItems.filter((item) => item.section === section);

          if (sectionItems.length === 0) return null;

          return (
            <div key={section} className="space-y-2">
              <p
                className={[
                  "px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 transition-all duration-500",
                  expanded ? "max-h-6 opacity-100" : "max-h-0 overflow-hidden opacity-0",
                ].join(" ")}
              >
                {label}
              </p>

              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setExpanded(false)}
                    className={[
                      "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "bg-[#EAF1EC] text-[#274733]"
                        : "text-gray-700 hover:bg-[#EAF1EC] hover:text-[#274733]",
                    ].join(" ")}
                  >
                    <Icon className="h-5 w-5 shrink-0" />

                    <span
                      className={[
                        "overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
                        expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t pt-4">
        {user && (
          <div
            className={[
              "mb-3 overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
              expanded ? "max-h-28 opacity-100" : "max-h-0 opacity-0",
            ].join(" ")}
          >
            <p className="text-sm font-semibold text-[#1E1E1E]">{user.user.username}</p>
            <p className="text-xs text-gray-500">{user.user.email}</p>
            <p className="mt-1 text-xs font-medium text-[#3D6B49]">{user.role.name}</p>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
        >
          <span
            className={[
              "overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
              expanded ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0",
            ].join(" ")}
          >
            Logout
          </span>

          {!expanded && <span>⎋</span>}
        </button>
      </div>
    </aside>
  );
}
