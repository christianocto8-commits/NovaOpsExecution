"use client";

import { ReactNode } from "react";

type DrawerShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
};

export function DrawerShell({
  open,
  onClose,
  children,
  maxWidth = "max-w-xl",
}: DrawerShellProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`h-full w-full ${maxWidth} overflow-y-auto border-l border-slate-200 bg-white shadow-2xl`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
