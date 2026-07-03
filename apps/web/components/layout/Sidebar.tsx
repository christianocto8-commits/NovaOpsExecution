"use client";

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

  const visibleMenuItems = menuItems.filter((item) => can(item.permission));

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white px-4 py-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#274733]">NovaOps</h1>
        <p className="text-sm text-gray-500">Execution System</p>
      </div>

      <nav className="flex-1 space-y-2">
        {visibleMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-[#EAF1EC] hover:text-[#274733]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t pt-4">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-semibold text-[#1E1E1E]">
              {user.name}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-[#3D6B49]">
              {user.role?.name ?? "No Role"}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="w-full rounded-lg border border-red-200 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}