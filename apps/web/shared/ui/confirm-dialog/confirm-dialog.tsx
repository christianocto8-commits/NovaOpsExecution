"use client";

import { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-emerald-700 text-white hover:bg-emerald-800";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>

        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>

          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}