"use client";

import {
  EnterpriseFilterChangeHandler,
  EnterpriseFilterDefinition,
  EnterpriseFilterState,
  EnterpriseFilterValue,
  EnterpriseSavedView,
} from "../types";
import { createInitialFilterState, getActiveFilterCount } from "../utils/filter-utils";
import { FilterChipList } from "./filter-chip-list";
import { SavedViewSelector } from "./saved-view-selector";

type FilterBarProps = {
  definitions: EnterpriseFilterDefinition[];
  filters?: EnterpriseFilterState;
  onFiltersChange?: EnterpriseFilterChangeHandler;
  savedViewScope?: string;
  enableSavedViews?: boolean;
};

export function FilterBar({
  definitions,
  filters,
  onFiltersChange,
  savedViewScope = "default",
  enableSavedViews = false,
}: FilterBarProps) {
  const currentFilters = filters ?? createInitialFilterState(definitions);
  const activeFilterCount = getActiveFilterCount(currentFilters);

  function updateFilter(key: string, value: EnterpriseFilterValue) {
    onFiltersChange?.({
      ...currentFilters,
      [key]: value,
    });
  }

  function clearFilter(key: string) {
    const definition = definitions.find((item) => item.key === key);

    if (!definition) return;

    const emptyValue =
      definition.type === "multi_select" ? [] : definition.type === "boolean" ? null : "";

    updateFilter(key, emptyValue);
  }

  function resetFilters() {
    onFiltersChange?.(createInitialFilterState(definitions));
  }

  function applySavedView(view: EnterpriseSavedView) {
    onFiltersChange?.({
      ...createInitialFilterState(definitions),
      ...view.filters,
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        {enableSavedViews ? (
          <SavedViewSelector
            scope={savedViewScope}
            filters={currentFilters}
            onApplyView={applySavedView}
          />
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {definitions.map((definition) => (
              <label key={definition.key} className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {definition.label}
                </span>

                {definition.type === "select" ? (
                  <select
                    value={String(currentFilters[definition.key] ?? "")}
                    onChange={(event) => updateFilter(definition.key, event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">{definition.placeholder ?? `All ${definition.label}`}</option>

                    {(definition.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : definition.type === "boolean" ? (
                  <select
                    value={
                      currentFilters[definition.key] === null
                        ? ""
                        : String(currentFilters[definition.key])
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      updateFilter(definition.key, value === "" ? null : value === "true");
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={definition.type === "number" ? "number" : "text"}
                    value={String(currentFilters[definition.key] ?? "")}
                    onChange={(event) => updateFilter(definition.key, event.target.value)}
                    placeholder={definition.placeholder ?? `Filter ${definition.label}`}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              {activeFilterCount} active
            </span>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>

        <FilterChipList
          definitions={definitions}
          filters={currentFilters}
          onClearFilter={clearFilter}
          onReset={resetFilters}
        />
      </div>
    </div>
  );
}
