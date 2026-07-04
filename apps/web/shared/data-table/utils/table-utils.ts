import { EnterpriseColumn } from "../types";

export function getCellValue<T>(row: T, key: keyof T | string) {
  return (row as Record<string, unknown>)[String(key)];
}

export function normalizeSearchValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

export function filterRows<T>(
  rows: T[],
  columns: EnterpriseColumn<T>[],
  search: string
) {
  const query = search.trim().toLowerCase();

  if (!query) return rows;

  return rows.filter((row) =>
    columns.some((column) =>
      normalizeSearchValue(getCellValue(row, column.key)).includes(query)
    )
  );
}

export function sortRows<T>(
  rows: T[],
  sortKey: string | null,
  direction: "asc" | "desc"
) {
  if (!sortKey) return rows;

  return [...rows].sort((a, b) => {
    const first = getCellValue(a, sortKey);
    const second = getCellValue(b, sortKey);

    if (first === second) return 0;
    if (first === null || first === undefined) return 1;
    if (second === null || second === undefined) return -1;

    const result = String(first).localeCompare(String(second), undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? result : -result;
  });
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
