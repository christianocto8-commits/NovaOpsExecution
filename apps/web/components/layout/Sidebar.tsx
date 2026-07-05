"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { label: "Dashboard", href: "/", permission: "dashboard.view" },
  { label: "Forms", href: "/forms", permission: "builder.view" },
  { label: "Execution", href: "/execution", permission: "execution.view" },
  { label: "Tasks", href: "/tasks", permission: "task.view" },
  { label: "Reports", href: "/reports", permission: "report.view" },
  { label: "Settings", href: "/settings", permission: "settings.view" },
];

export function Sidebar() {
  const { user, logout, can } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const visibleMenuItems = menuItems.filter((item) => can(item.permission));

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

      <nav className="flex-1 space-y-2">
        {visibleMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setExpanded(false)}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-[#EAF1EC] hover:text-[#274733]"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#3D6B49]" />

            <span
              className={[
                "overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
                expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0",
              ].join(" ")}
            >
              {item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="border-t pt-4">
        {user && (
          <div
            className={[
              "mb-3 overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out",
              expanded ? "max-h-28 opacity-100" : "max-h-0 opacity-0",
            ].join(" ")}
          >
            <p className="text-sm font-semibold text-[#1E1E1E]">{user.username}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-[#3D6B49]">{user.role ?? "No Role"}</p>
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


