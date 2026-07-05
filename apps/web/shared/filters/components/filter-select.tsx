"use client";

import { EnterpriseFilterOption } from "../types/filter";

type FilterSelectProps = {
  label: string;
  value?: string | null;
  placeholder?: string;
  options: EnterpriseFilterOption[];
  onChange: (value: string | null) => void;
};

export function FilterSelect({
  label,
  value,
  placeholder = "All",
  options,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="flex min-w-[180px] flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-500">{label}</span>

      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
