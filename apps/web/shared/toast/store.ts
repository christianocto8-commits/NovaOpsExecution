import { createLocalId } from "@/lib/local-id";
import { ToastItem, ToastOptions } from "./types";

let toasts: ToastItem[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeToast(listener: () => void) {
  listeners = [...listeners, listener];

  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function getToastSnapshot() {
  return toasts;
}

export function showToast(options: ToastOptions) {
  const toast: ToastItem = {
    id: createLocalId(),
    variant: "info",
    duration: 4500,
    createdAt: Date.now(),
    ...options,
  };

  toasts = [toast, ...toasts].slice(0, 5);
  emit();

  if (toast.duration && toast.duration > 0) {
    window.setTimeout(() => {
      dismissToast(toast.id);
    }, toast.duration);
  }

  return toast.id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function clearToasts() {
  toasts = [];
  emit();
}
