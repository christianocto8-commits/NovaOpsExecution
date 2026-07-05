import { ChevronRight } from "lucide-react";

import { CommandItem as CommandItemType } from "../types";
import { ShortcutBadge } from "./shortcut-badge";

type CommandItemProps = {
  command: CommandItemType;
  isActive: boolean;
  onSelect: () => void;
};

export function CommandItem({ command, isActive, onSelect }: CommandItemProps) {
  const Icon = command.icon;
  const subtitle = command.description;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150",
        isActive
          ? "bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-100"
          : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold transition",
            isActive
              ? "border-emerald-200 bg-white text-emerald-700"
              : "border-slate-200 bg-white text-slate-500 group-hover:border-slate-300",
          ].join(" ")}
        >
          {Icon ? <Icon className="h-4 w-4" /> : command.title.charAt(0)}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{command.title}</span>

          {subtitle ? (
            <span className="mt-0.5 block truncate text-xs text-slate-500">{subtitle}</span>
          ) : null}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {command.shortcut ? <ShortcutBadge>{command.shortcut}</ShortcutBadge> : null}

        <ChevronRight
          className={["h-4 w-4 transition", isActive ? "text-emerald-500" : "text-slate-300"].join(
            " "
          )}
        />
      </span>
    </button>
  );
}
