"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tasks", href: "/dashboard/tasks" },
  { label: "Draft Center", href: "/dashboard/drafts" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Users", href: "/dashboard/users" },
  { label: "Outlets", href: "/dashboard/outlets" },
  { label: "Settings", href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 border-r border-[#E7ECE9] bg-white lg:block">
      <div className="flex h-16 items-center border-b border-[#E7ECE9] px-6">
        <div>
          <div className="text-lg font-bold text-[#274733]">NovaOps</div>
          <div className="text-xs text-gray-500">Enterprise Console</div>
        </div>
      </div>

      <nav className="space-y-1 px-4 py-5">
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-[#EAF1EC] text-[#274733]"
                  : "text-gray-600 hover:bg-[#F7FAF8] hover:text-[#274733]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}