/* eslint-disable @next/next/no-img-element */

"use client";

import { ImageIcon, Trash2 } from "lucide-react";

import { EvidenceItem } from "../types";

type EvidenceCardProps = {
  item: EvidenceItem;
  onRemove?: (id: string) => void;
};

export function EvidenceCard({ item, onRemove }: EvidenceCardProps) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex aspect-video items-center justify-center bg-slate-50">
        {item.url ? (
          <img
            src={item.url}
            alt={item.caption ?? "Evidence"}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-300" />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-800">
            {item.caption ?? "Evidence"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{item.uploadedAt ?? "Saved evidence"}</p>
        </div>

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
