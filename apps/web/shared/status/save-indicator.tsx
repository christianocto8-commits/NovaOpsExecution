"use client";

import { DraftSaveState } from "@/features/tasks/types/autosave";

type SaveIndicatorProps = {
  state: DraftSaveState;
  lastSavedAt?: Date | null;
  compact?: boolean;
};

function formatTime(date?: Date | null) {
  if (!date) return null;

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaveIndicator({ state, lastSavedAt, compact = false }: SaveIndicatorProps) {
  const savedTime = formatTime(lastSavedAt);

  const label =
    state === "saving"
      ? "Saving..."
      : state === "dirty"
        ? "Unsaved changes"
        : state === "saved"
          ? savedTime
            ? `Saved ${savedTime}`
            : "Saved"
          : state === "error"
            ? "Save failed"
            : "Ready";

  const dotClass =
    state === "saving"
      ? "bg-blue-500"
      : state === "dirty"
        ? "bg-amber-500"
        : state === "saved"
          ? "bg-emerald-500"
          : state === "error"
            ? "bg-red-500"
            : "bg-slate-300";

  if (compact && state === "idle") {
    return null;
  }

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500"
        title={label}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className="max-w-[4.5rem] truncate">{state === "dirty" ? "Unsaved" : label}</span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </div>
  );
}
