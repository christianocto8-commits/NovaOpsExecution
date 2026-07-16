"use client";

import { Plus } from "lucide-react";

type UploadPlaceholderProps = {
  onAdd: () => void;
  title?: string;
  description?: string;
};

export function UploadPlaceholder({
  onAdd,
  title = "Add Evidence",
  description = "Pilih bukti dari perangkat",
}: UploadPlaceholderProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-emerald-300 hover:bg-emerald-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
        <Plus className="h-5 w-5" />
      </span>

      <span className="mt-3 text-sm font-bold text-slate-800">{title}</span>
      <span className="mt-1 text-xs text-slate-500">{description}</span>
    </button>
  );
}
