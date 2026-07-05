"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useClickOutside, useEscapeKey } from "@/shared/hooks";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
};

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  size = "md",
  closeOnOutsideClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  useClickOutside(modalRef, closeModal, {
    enabled: open && closeOnOutsideClick,
  });

  useEscapeKey(closeModal, open && closeOnEscape);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          sizeClass[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              {title ? <h2 className="text-lg font-bold text-slate-950">{title}</h2> : null}

              {description ? (
                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!title && !description ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="px-6 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
