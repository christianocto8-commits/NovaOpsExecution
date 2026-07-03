import { ReactNode } from "react";

type ShortcutBadgeProps = {
  children: ReactNode;
};

export function ShortcutBadge({ children }: ShortcutBadgeProps) {
  return (
    <kbd className="inline-flex min-h-5 items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-bold leading-none text-slate-500 shadow-sm">
      {children}
    </kbd>
  );
}