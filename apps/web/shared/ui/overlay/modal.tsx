"use client";

import { ReactNode } from "react";
import { IconButton } from "@/shared/ui/primitives";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative z-10 w-full rounded-2xl border border-[#E7ECE9] bg-white shadow-2xl",
          sizeClass[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E7ECE9] px-6 py-5">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-[#1E1E1E]">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            ) : null}
          </div>

          <IconButton label="Close modal" icon="×" onClick={onClose} />
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-[#E7ECE9] px-6 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}