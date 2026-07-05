"use client";

import { useMemo, useState } from "react";

import { EnterpriseFilterState, FilterBar, createInitialFilterState } from "@/shared/filters";

import { DataTableEmptyState } from "./components/data-table-empty-state";
import { DataTablePagination } from "./components/data-table-pagination";
import { DataTableToolbar } from "./components/data-table-toolbar";
import { useEnterpriseDataTable } from "./hooks/use-enterprise-data-table";
import { EnterpriseDataTableProps } from "./types";
import { getCellValue } from "./utils/table-utils";

function alignClass(align?: "left" | "center" | "right") {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function EnterpriseDataTable<T>({
  title,
  description,
  columns,
  data,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  pageSize = 10,
  getRowId,
  actions,
  rowActions,
  onRowClick,
  defaultDensity = "comfortable",
  filterDefinitions,
  filters,
  onFiltersChange,
  enableFilters = false,
  enableSavedViews = false,
  savedViewScope = "default",
}: EnterpriseDataTableProps<T>) {
  const [internalFilters, setInternalFilters] = useState<EnterpriseFilterState>(() =>
    createInitialFilterState(filterDefinitions ?? [])
  );

  const activeFilters = useMemo(() => filters ?? internalFilters, [filters, internalFilters]);

  function handleFiltersChange(nextFilters: EnterpriseFilterState) {
    setInternalFilters(nextFilters);
    onFiltersChange?.(nextFilters);
  }

  const table = useEnterpriseDataTable({
    data,
    columns,
    pageSize,
    defaultDensity,
    filterDefinitions,
    filters: activeFilters,
  });

  const cellPadding = table.density === "compact" ? "px-5 py-2.5" : "px-5 py-4";

  const headerColSpan = table.columns.length + (rowActions ? 1 : 0);
  const shouldShowFilters = enableFilters && Boolean(filterDefinitions?.length);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <DataTableToolbar
        title={title}
        description={description}
        search={table.search}
        searchPlaceholder={searchPlaceholder}
        actions={actions}
        columns={table.allColumns}
        hiddenColumnKeys={table.hiddenColumnKeys}
        density={table.density}
        onSearchChange={table.handleSearch}
        onToggleColumn={table.toggleColumn}
        onDensityChange={table.setDensity}
      />

      {shouldShowFilters && filterDefinitions ? (
        <div className="border-b border-slate-200 bg-slate-50/60 p-4">
          <FilterBar
            definitions={filterDefinitions}
            filters={activeFilters}
            onFiltersChange={handleFiltersChange}
            enableSavedViews={enableSavedViews}
            savedViewScope={savedViewScope}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-50">
            <tr>
              {table.columns.map((column) => {
                const key = String(column.key);
                const active = table.sortKey === key;

                return (
                  <th
                    key={key}
                    scope="col"
                    className={[
                      "border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                      alignClass(column.align),
                      column.sortable ? "cursor-pointer select-none" : "",
                      column.className ?? "",
                    ].join(" ")}
                    onClick={() => table.handleSort(key, column.sortable)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.header ?? column.label ?? String(column.key)}
                      {column.sortable ? (
                        <span className="text-[10px] text-slate-400">
                          {active ? (table.sortDirection === "asc" ? "↑" : "↓") : "↕"}
                        </span>
                      ) : null}
                    </span>
                  </th>
                );
              })}

              {rowActions ? (
                <th
                  scope="col"
                  className="border-b border-slate-200 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {table.rows.length > 0 ? (
              table.rows.map((row, rowIndex) => (
                <tr
                  key={getRowId ? getRowId(row, rowIndex) : String(rowIndex)}
                  className={[
                    "transition hover:bg-slate-50",
                    onRowClick ? "cursor-pointer" : "",
                  ].join(" ")}
                  onClick={() => onRowClick?.(row)}
                >
                  {table.columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={[
                        "border-b border-slate-100 text-sm text-slate-700",
                        cellPadding,
                        alignClass(column.align),
                        column.className ?? "",
                      ].join(" ")}
                    >
                      {column.render
                        ? column.render(row)
                        : String(getCellValue(row, column.key) ?? "-")}
                    </td>
                  ))}

                  {rowActions ? (
                    <td
                      className={[
                        "border-b border-slate-100 text-right text-sm text-slate-700",
                        cellPadding,
                      ].join(" ")}
                    >
                      <div className="inline-flex items-center justify-end gap-2">
                        {rowActions(row)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <DataTableEmptyState
                colSpan={headerColSpan}
                title={emptyTitle}
                description={emptyDescription}
              />
            )}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        page={table.page}
        totalPages={table.totalPages}
        totalRows={table.totalRows}
        onPageChange={table.setPage}
      />
    </section>
  );
}

export type {
  EnterpriseColumn,
  EnterpriseDataTableDensity,
  EnterpriseDataTableProps,
} from "./types";
