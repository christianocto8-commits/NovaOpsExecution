"use client";

import { InputHTMLAttributes } from "react";

type EnterpriseInputProps = InputHTMLAttributes<HTMLInputElement>;

export function EnterpriseInput({ className = "", ...props }: EnterpriseInputProps) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        className,
      ].join(" ")}
    />
  );
}
