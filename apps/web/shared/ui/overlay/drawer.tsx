"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/shared/ui/primitives";

type DrawerProps = {
  open: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: "md" | "lg" | "xl";
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
}: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl",
          widthClass[width]
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

          <IconButton label="Close drawer" icon="×" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <div className="border-t border-[#E7ECE9] px-6 py-4">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}