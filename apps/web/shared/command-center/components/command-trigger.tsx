"use client";

import { Search } from "lucide-react";
import { useCommandCenter } from "../hooks/use-command-center";

export function CommandTrigger() {
  const { setOpen } = useCommandCenter();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="hidden min-w-72 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:bg-white md:flex"
    >
      <span className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Search or jump to...
      </span>

      <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">
        Ctrl K
      </span>
    </button>
  );
}
