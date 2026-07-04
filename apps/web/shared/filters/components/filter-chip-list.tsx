"use client";

import {
  EnterpriseFilterDefinition,
  EnterpriseFilterState,
  EnterpriseFilterValue,
} from "../types";
import { isEmptyFilterValue } from "../utils/filter-utils";

type FilterChipListProps = {
  definitions: EnterpriseFilterDefinition[];
  filters: EnterpriseFilterState;
  onClearFilter: (key: string) => void;
  onReset: () => void;
};

function formatFilterValue(
  definition: EnterpriseFilterDefinition,
  value: EnterpriseFilterValue
) {
  if (Array.isArray(value)) return value.join(", ");

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object" && value !== null) {
    return [value.from, value.to].filter(Boolean).join(" → ");
  }

  const option = definition.options?.find(
    (item) => String(item.value) === String(value)
  );

  return option?.label ?? String(value);
}

export function FilterChipList({
  definitions,
  filters,
  onClearFilter,
  onReset,
}: FilterChipListProps) {
  const activeFilters = definitions.filter(
    (definition) => !isEmptyFilterValue(filters[definition.key])
  );

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Active Filters
      </span>

      {activeFilters.map((definition) => (
        <button
          key={definition.key}
          type="button"
          onClick={() => onClearFilter(definition.key)}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100"
          title="Clear filter"
        >
          <span>{definition.label}</span>
          <span className="text-emerald-500">
            {formatFilterValue(definition, filters[definition.key])}
          </span>
          <span aria-hidden>×</span>
        </button>
      ))}

      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
      >
        Clear all
      </button>
    </div>
  );
}
