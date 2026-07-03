"use client";

import { EnterpriseToolbarAction } from "../types/toolbar";

type EnterpriseToolbarProps = {
  title?: string;
  description?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: EnterpriseToolbarAction[];
};

function getActionClass(variant: EnterpriseToolbarAction["variant"]) {
  if (variant === "primary") {
    return "bg-emerald-700 text-white hover:bg-emerald-800";
  }

  if (variant === "ghost") {
    return "border border-transparent text-slate-600 hover:bg-slate-50";
  }

  return "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

export function EnterpriseToolbar({
  title,
  description,
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  actions = [],
}: EnterpriseToolbarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {title ? (
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          ) : null}

          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {onSearchChange ? (
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                value={searchValue ?? ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 md:w-72"
              />
            </div>
          ) : null}

          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${getActionClass(
                    action.variant,
                  )}`}
                >
                  {action.icon ? <span>{action.icon}</span> : null}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}