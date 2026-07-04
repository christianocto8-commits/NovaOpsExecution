"use client";

import { Density } from "../types";

type DensitySelectorProps = {
  value: Density;
  onChange: (density: Density) => void;
};

export function DensitySelector({ value, onChange }: DensitySelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Density)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
      aria-label="Table density"
    >
      <option value="comfortable">Comfortable</option>
      <option value="compact">Compact</option>
      <option value="tight">Tight</option>
    </select>
  );
}
