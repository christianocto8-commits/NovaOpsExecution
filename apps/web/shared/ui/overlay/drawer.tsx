"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useClickOutside, useEscapeKey } from "@/shared/hooks";

type DrawerProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: "md" | "lg" | "xl";
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
};

const widthClass = {
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Drawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  width = "lg",
  closeOnOutsideClick = true,
  closeOnEscape = true,
}: DrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);

  const closeDrawer = useCallback(() => {
    onClose();
  }, [onClose]);

  useClickOutside(drawerRef, closeDrawer, {
    enabled: open && closeOnOutsideClick,
  });

  useEscapeKey(closeDrawer, open && closeOnEscape);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm">
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute right-0 top-0 flex h-dvh w-full max-w-full flex-col bg-white shadow-2xl",
          "animate-in slide-in-from-right duration-300",
          widthClass[width]
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-bold text-slate-950">{title}</h2> : null}

            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
