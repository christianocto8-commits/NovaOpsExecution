"use client";

import { FilterChip } from "./filter-chip";
import { FilterSelect } from "./filter-select";
import {
  EnterpriseFilterDefinition,
  EnterpriseFilterState,
} from "../types/filter";

type FilterBarProps = {
  filters: EnterpriseFilterDefinition[];
  value: EnterpriseFilterState;
  onChange: (value: EnterpriseFilterState) => void;
  onApply?: () => void;
  onReset?: () => void;
};

export function FilterBar({
  filters,
  value,
  onChange,
  onApply,
  onReset,
}: FilterBarProps) {
  const activeFilters = filters
    .map((filter) => {
      const activeValue = value[filter.key];

      if (!activeValue || Array.isArray(activeValue)) return null;

      const optionLabel =
        filter.options.find((option) => option.value === activeValue)?.label ??
        activeValue;

      return {
        key: filter.key,
        label: filter.label,
        value: optionLabel,
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string;
  }>;

  function updateFilter(key: string, nextValue: string | null) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  function removeFilter(key: string) {
    onChange({
      ...value,
      [key]: null,
    });
  }

  function resetFilters() {
    const resetValue = filters.reduce<EnterpriseFilterState>((acc, filter) => {
      acc[filter.key] = null;
      return acc;
    }, {});

    onChange(resetValue);
    onReset?.();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <FilterSelect
              key={filter.key}
              label={filter.label}
              placeholder={filter.placeholder}
              options={filter.options}
              value={
                typeof value[filter.key] === "string"
                  ? value[filter.key]
                  : null
              }
              onChange={(nextValue) => updateFilter(filter.key, nextValue)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={onApply}
            className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {activeFilters.map((filter) => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={() => removeFilter(filter.key)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}