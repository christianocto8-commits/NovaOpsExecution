"use client";

import { X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { dismissToast, getToastSnapshot, subscribeToast } from "../store";
import { ToastVariant } from "../types";

const toastStyles: Record<
  ToastVariant,
  {
    icon: string;
    container: string;
    iconBox: string;
    title: string;
  }
> = {
  success: {
    icon: "✓",
    container: "border-emerald-200 bg-emerald-50",
    iconBox: "bg-emerald-100 text-emerald-700",
    title: "Success",
  },
  error: {
    icon: "✕",
    container: "border-red-200 bg-red-50",
    iconBox: "bg-red-100 text-red-700",
    title: "Error",
  },
  warning: {
    icon: "⚠",
    container: "border-amber-200 bg-amber-50",
    iconBox: "bg-amber-100 text-amber-700",
    title: "Warning",
  },
  info: {
    icon: "ⓘ",
    container: "border-blue-200 bg-blue-50",
    iconBox: "bg-blue-100 text-blue-700",
    title: "Info",
  },
};

export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToast, getToastSnapshot, getToastSnapshot);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-5 top-5 z-[60] flex w-[min(420px,calc(100vw-2.5rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const variant = toast.variant ?? "info";
        const style = toastStyles[variant];

        return (
          <div
            key={toast.id}
            className={`rounded-2xl border p-4 shadow-lg backdrop-blur animate-in slide-in-from-right-4 fade-in duration-200 ${style.container}`}
          >
            <div className="flex gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style.iconBox}`}
              >
                {style.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-950">{toast.title ?? style.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p>

                {toast.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
