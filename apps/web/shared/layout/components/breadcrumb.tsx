"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function toTitle(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Breadcrumb() {
  const pathname = usePathname();

  const parts = pathname.split("/").filter(Boolean);

  const crumbs = parts.map((part, index) => {
    const href = "/" + parts.slice(0, index + 1).join("/");

    return {
      label: part === "dashboard" ? "Dashboard" : toTitle(part),
      href,
    };
  });

  return (
    <div className="flex items-center gap-2 text-sm">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <div key={crumb.href} className="flex items-center gap-2">
            {index > 0 && <span className="text-slate-300">/</span>}

            {isLast ? (
              <span className="font-semibold text-slate-800">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-slate-500 hover:text-emerald-700">
                {crumb.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
