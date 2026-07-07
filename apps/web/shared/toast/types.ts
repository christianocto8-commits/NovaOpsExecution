import { ReactNode } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastOptions = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
};

export type ToastItem = ToastOptions & {
  id: string;
  createdAt: number;
};
