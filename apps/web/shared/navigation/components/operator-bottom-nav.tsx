"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, History, LayoutGrid } from "lucide-react";

const operatorNavItems = [
  { href: "/dashboard/tasks", label: "Tasks", icon: ClipboardCheck },
  { href: "/dashboard/drafts", label: "Drafts", icon: FileText },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/operator", label: "Home", icon: LayoutGrid },
] as const;

export function OperatorBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE8E1] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {operatorNavItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/dashboard/tasks" && pathname.startsWith("/dashboard/tasks"));

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
