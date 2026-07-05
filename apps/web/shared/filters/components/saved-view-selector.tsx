"use client";

import { useState } from "react";

import { EnterpriseFilterState, EnterpriseSavedView } from "../types";
import { useSavedFilterViews } from "../hooks/use-saved-filter-views";

type SavedViewSelectorProps = {
  scope?: string;
  filters: EnterpriseFilterState;
  onApplyView: (view: EnterpriseSavedView) => void;
};

export function SavedViewSelector({
  scope = "default",
  filters,
  onApplyView,
}: SavedViewSelectorProps) {
  const [viewName, setViewName] = useState("");
  const savedViews = useSavedFilterViews(scope);

  function handleCreateView() {
    const name = viewName.trim();

    if (!name) return;

    savedViews.createView(name, filters);
    setViewName("");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            placeholder="Save current filters as view..."
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />

          <button
            type="button"
            onClick={handleCreateView}
            className="rounded-xl bg-[#274733] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3D6B49]"
          >
            Save View
          </button>
        </div>

        <select
          value=""
          onChange={(event) => {
            const selected = savedViews.views.find((view) => view.id === event.target.value);

            if (selected) onApplyView(selected);
          }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Apply saved view...</option>
          {savedViews.views.map((view) => (
            <option key={view.id} value={view.id}>
              {view.isDefault ? "★ " : ""}
              {view.name}
            </option>
          ))}
        </select>
      </div>

      {savedViews.views.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {savedViews.views.map((view) => (
            <div
              key={view.id}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
            >
              <button
                type="button"
                onClick={() => onApplyView(view)}
                className="text-[#274733] hover:text-[#3D6B49]"
              >
                {view.name}
              </button>

              <button
                type="button"
                onClick={() => savedViews.setDefaultView(view.id)}
                className="text-slate-400 hover:text-amber-500"
                title="Set default"
              >
                ★
              </button>

              <button
                type="button"
                onClick={() => savedViews.deleteView(view.id)}
                className="text-slate-400 hover:text-red-500"
                title="Delete view"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
