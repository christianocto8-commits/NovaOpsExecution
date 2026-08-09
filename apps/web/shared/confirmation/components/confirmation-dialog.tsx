"use client";

import { useState, useSyncExternalStore } from "react";

import { getConfirmationSnapshot, resolveConfirmation, subscribeConfirmation } from "../store";
import { ConfirmationVariant } from "../types";

const variantStyles: Record<
  ConfirmationVariant,
  {
    icon: string;
    iconClassName: string;
    buttonClassName: string;
  }
> = {
  danger: {
    icon: "🗑",
    iconClassName: "bg-red-50 text-red-700",
    buttonClassName: "bg-red-600 text-white hover:bg-red-700",
  },
  warning: {
    icon: "⚠",
    iconClassName: "bg-amber-50 text-amber-700",
    buttonClassName: "bg-amber-600 text-white hover:bg-amber-700",
  },
  info: {
    icon: "ⓘ",
    iconClassName: "bg-blue-50 text-blue-700",
    buttonClassName: "bg-blue-600 text-white hover:bg-blue-700",
  },
  success: {
    icon: "✓",
    iconClassName: "bg-emerald-50 text-emerald-700",
    buttonClassName: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
};

export function ConfirmationDialog() {
  const request = useSyncExternalStore(
    subscribeConfirmation,
    getConfirmationSnapshot,
    getConfirmationSnapshot
  );

  const [isLoading, setIsLoading] = useState(false);

  if (!request) return null;

  const variant = request.variant ?? "info";
  const style = variantStyles[variant];

  const handleCancel = () => {
    if (isLoading) return;

    resolveConfirmation(false);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    resolveConfirmation(true);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${style.iconClassName}`}
          >
            {style.icon}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-950">{request.title}</h2>

            {request.description ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {request.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {request.cancelText ?? "Cancel"}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${style.buttonClassName}`}
          >
            {isLoading
              ? (request.loadingText ?? "Processing...")
              : (request.confirmText ?? "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
