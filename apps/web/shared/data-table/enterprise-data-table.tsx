"use client";

import { useMemo, useState } from "react";

import { ExportMenu } from "@/shared/export/components";
import {
  exportToCsv,
  exportToExcel,
  exportToPdf,
} from "@/shared/export/utils";

export type EnterpriseColumn<T> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
};

type EnterpriseDataTableProps<T extends Record<string, string | number>> = {
  title: string;
  description?: string;
  data: T[];
  columns: EnterpriseColumn<T>[];
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  exportable?: boolean;
  exportFileName?: string;
  exportSheetName?: string;
};

export function EnterpriseDataTable<T extends Record<string, string | number>>({
  title,
  description,
  data,
  columns,
  searchPlaceholder = "Search...",
  pageSizeOptions = [10, 25, 50],
  exportable = false,
  exportFileName = "novaops-export",
  exportSheetName = "Data",
}: EnterpriseDataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    let result = data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(keyword)
      )
    );

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        return sortDirection === "asc"
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }

    return result;
  }, [data, search, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const paginatedData = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;

    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize, totalPages]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSort(key: keyof T, sortable?: boolean) {
    if (!sortable) return;

    setPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function handlePageSizeChange(value: string) {
    setPageSize(Number(value));
    setPage(1);
  }

  function handleExportExcel() {
    exportToExcel({
      fileName: exportFileName,
      sheetName: exportSheetName,
      rows: filteredData,
    });
  }

  function handleExportPdf() {
    exportToPdf({
      fileName: exportFileName,
      title,
      columns,
      rows: filteredData,
    });
  }

  function handleExportCsv() {
    exportToCsv({
      fileName: exportFileName,
      rows: filteredData,
    });
  }

  function handlePrint() {
    exportToPdf({
      fileName: exportFileName,
      title,
      columns,
      rows: filteredData,
      openInNewTab: true,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <input
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 md:w-72"
          />

          {exportable ? (
            <ExportMenu
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
              onPrint={handlePrint}
              disabled={filteredData.length === 0}
            />
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-5 py-3">
                  <button
                    type="button"
                    onClick={() => handleSort(column.key, column.sortable)}
                    className={
                      column.sortable
                        ? "font-semibold hover:text-emerald-700"
                        : "cursor-default font-semibold"
                    }
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      <span className="ml-1">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className="px-5 py-4 text-slate-700"
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}

            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  No data found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <div>
          Showing{" "}
          <span className="font-medium text-slate-700">
            {filteredData.length === 0
              ? 0
              : (Math.min(page, totalPages) - 1) * pageSize + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium text-slate-700">
            {Math.min(
              Math.min(page, totalPages) * pageSize,
              filteredData.length
            )}
          </span>{" "}
          of{" "}
          <span className="font-medium text-slate-700">
            {filteredData.length}
          </span>{" "}
          results
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <select
            value={pageSize}
            onChange={(event) => handlePageSizeChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-slate-500">
              Page {Math.min(page, totalPages)} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}