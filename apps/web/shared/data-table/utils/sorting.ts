import { SortDirection } from "../types";

export function sortRows<T extends Record<string, string | number>>(
  rows: T[],
  sortKey: keyof T | null,
  sortDirection: SortDirection
) {
  if (!sortKey) return rows;

  return [...rows].sort((a, b) => {
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
