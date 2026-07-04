"use client";

import { ReactNode } from "react";

type EnterpriseFieldProps = {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
};

export function EnterpriseField({
  label,
  description,
  error,
  children,
}: EnterpriseFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      {children}

      {description ? (
        <span className="block text-xs text-slate-500">{description}</span>
      ) : null}

      {error ? (
        <span className="block text-xs font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}
