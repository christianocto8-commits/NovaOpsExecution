"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { commandItems } from "../constants";
import { useCommandCenter } from "../hooks/use-command-center";
import { filterCommandItems, groupCommandItems } from "../utils";
import { useClickOutside, useEscapeKey } from "@/shared/hooks";

export function CommandDialog() {
  const router = useRouter();
  const { open, setOpen } = useCommandCenter();
  const [query, setQuery] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  useClickOutside(dialogRef, closeDialog, { enabled: open });
  useEscapeKey(closeDialog, open);

  const filteredItems = useMemo(() => {
    return filterCommandItems(commandItems, query);
  }, [query]);

  const groupedItems = useMemo(() => {
    return groupCommandItems(filteredItems);
  }, [filteredItems]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  function runCommand(href?: string, action?: () => void) {
    if (action) {
      action();
    }

    if (href) {
      router.push(href);
    }

    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm">
      <div ref={dialogRef} className="mx-auto mt-20 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks, reports, outlets, users..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={closeDialog}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close command center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[520px] overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-semibold text-slate-900">
                No results found
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Try searching for tasks, reports, outlets, users, or settings.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedItems).map(([group, items]) => (
                <div key={group}>
                  <div className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {group}
                  </div>

                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => runCommand(item.href, item.action)}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-950">
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="block truncate text-xs text-slate-500">
                                {item.description}
                              </span>
                            )}
                          </span>

                          {item.shortcut && (
                            <span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-medium text-slate-400">
          <span>Press Esc to close</span>
          <span>NovaOps Command Center</span>
        </div>
      </div>
    </div>
  );
}
