"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, ClipboardCheck, FileText } from "lucide-react";

const operatorNavItems = [
  { href: "/dashboard/tasks", label: "Task", icon: ClipboardCheck },
  { href: "/dashboard/forms", label: "My Form", icon: FileText },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/notifications", label: "Notif", icon: Bell },
] as const;

export function OperatorBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE8E1] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {operatorNavItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-bold uppercase tracking-wide transition",
                  active ? "text-emerald-700" : "text-slate-400",
                ].join(" ")}
              >
                <Icon className={["size-5", active ? "text-emerald-700" : "text-slate-400"].join(" ")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
