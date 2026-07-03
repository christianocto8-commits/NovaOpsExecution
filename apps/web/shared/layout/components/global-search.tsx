"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const searchableItems = [
  {
    title: "Dashboard",
    description: "Operational overview and KPI summary",
    href: "/dashboard",
  },
  {
    title: "Outlets",
    description: "Manage multi-outlet locations",
    href: "/dashboard/outlets",
  },
  {
    title: "Tasks",
    description: "Track operational task execution",
    href: "/dashboard/tasks",
  },
  {
    title: "Draft Center",
    description: "Manage saved operational drafts",
    href: "/dashboard/drafts",
  },
  {
    title: "Reports",
    description: "Analyze reports and export CSV",
    href: "/dashboard/reports",
  },
  {
    title: "Settings",
    description: "Manage enterprise configuration",
    href: "/dashboard/settings",
  },
];

export function GlobalSearch() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];

    return searchableItems.filter((item) => {
      const target = `${item.title} ${item.description}`.toLowerCase();
      return target.includes(query.toLowerCase());
    });
  }, [query]);

  return (
    <div className="relative hidden w-[360px] md:block">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search workspace..."
        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
      />

      {query && (
        <div className="absolute right-0 top-12 z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Search Results
          </div>

          {results.length > 0 ? (
            <div className="max-h-80 overflow-auto p-2">
              {results.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setQuery("")}
                  className="block rounded-xl px-3 py-3 hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold text-slate-800">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500">{item.description}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-slate-500">
              No result found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}