"use client";

import { InputHTMLAttributes } from "react";

type EnterpriseCheckboxProps = InputHTMLAttributes<HTMLInputElement>;

export function EnterpriseCheckbox(props: EnterpriseCheckboxProps) {
  return (
    <input
      {...props}
      type="checkbox"
      className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
    />
  );
}
