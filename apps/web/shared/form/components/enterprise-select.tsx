"use client";

import { SelectHTMLAttributes } from "react";

type EnterpriseSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function EnterpriseSelect({ className = "", ...props }: EnterpriseSelectProps) {
  return (
    <select
      {...props}
      className={[
        "min-w-0 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:px-4",
        className,
      ].join(" ")}
    />
  );
}
