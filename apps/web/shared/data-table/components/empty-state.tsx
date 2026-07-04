"use client";

import { SlidersHorizontal } from "lucide-react";

export function DataTableEmptyState() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <SlidersHorizontal className="h-5 w-5" />
      </div>

      <p className="mt-3 text-sm font-semibold text-slate-900">
        No data found
      </p>

      <p className="mt-1 text-sm text-slate-500">
        Try changing your search keyword or filters.
      </p>
    </div>
  );
}
