"use client";

import { ReactNode } from "react";

import {
  EnterpriseColumn,
  EnterpriseDataTableDensity,
} from "../types";

type DataTableToolbarProps<T> = {
  title?: string;
  description?: string;
  search: string;
  searchPlaceholder?: string;
  actions?: ReactNode;
  columns: EnterpriseColumn<T>[];
  hiddenColumnKeys: string[];
  density: EnterpriseDataTableDensity;
  onSearchChange: (value: string) => void;
  onToggleColumn: (key: string) => void;
  onDensityChange: (density: EnterpriseDataTableDensity) => void;
};

export function DataTableToolbar<T>({
  title,
  description,
  search,
  searchPlaceholder = "Search data...",
  actions,
  columns,
  hiddenColumnKeys,
  density,
  onSearchChange,
  onToggleColumn,
  onDensityChange,
}: DataTableToolbarProps<T>) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {title ? (
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          ) : null}

          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Columns
          </span>

          {columns
            .filter((column) => column.hideable)
            .map((column) => {
              const key = String(column.key);
              const active = !hiddenColumnKeys.includes(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleColumn(key)}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-emerald-200 bg-white text-emerald-700"
                      : "border-slate-200 bg-white text-slate-400",
                  ].join(" ")}
                >
                  {column.header}
                </button>
              );
            })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Density
          </span>

          <button
            type="button"
            onClick={() => onDensityChange("comfortable")}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              density === "comfortable"
                ? "border-emerald-200 bg-white text-emerald-700"
                : "border-slate-200 bg-white text-slate-500",
            ].join(" ")}
          >
            Comfortable
          </button>

          <button
            type="button"
            onClick={() => onDensityChange("compact")}
            className={[
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
              density === "compact"
                ? "border-emerald-200 bg-white text-emerald-700"
                : "border-slate-200 bg-white text-slate-500",
            ].join(" ")}
          >
            Compact
          </button>
        </div>
      </div>
    </div>
  );
}
