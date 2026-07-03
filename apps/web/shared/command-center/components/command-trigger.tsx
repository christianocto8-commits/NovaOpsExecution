"use client";

import { Command, Search } from "lucide-react";

import { useCommandCenter } from "../hooks/use-command-center";
import { ShortcutBadge } from "./shortcut-badge";

export function CommandTrigger() {
  const { openCommandCenter } = useCommandCenter();

  return (
    <button
      type="button"
      onClick={openCommandCenter}
      className="hidden min-w-[280px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md lg:flex"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <Search className="h-4 w-4" />
        </span>

        <span>
          <span className="block text-sm font-semibold text-slate-700">
            Search or jump to...
          </span>
          <span className="block text-xs text-slate-400">
            Global command center
          </span>
        </span>
      </span>

      <span className="flex items-center gap-1">
        <ShortcutBadge>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K
          </span>
        </ShortcutBadge>
      </span>
    </button>
  );
}