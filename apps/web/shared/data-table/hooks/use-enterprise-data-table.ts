"use client";

import { useMemo, useState } from "react";

import { EnterpriseColumn, EnterpriseDataTableDensity } from "../types";
import {
  EnterpriseFilterDefinition,
  EnterpriseFilterState,
  applyEnterpriseFilters,
} from "@/shared/filters";
import { filterRows, paginateRows, sortRows } from "../utils/table-utils";

export function useEnterpriseDataTable<T>({
  data,
  columns,
  pageSize,
  defaultDensity = "comfortable",
  filterDefinitions,
  filters,
}: {
  data: T[];
  columns: EnterpriseColumn<T>[];
  pageSize: number;
  defaultDensity?: EnterpriseDataTableDensity;
  filterDefinitions?: EnterpriseFilterDefinition[];
  filters?: EnterpriseFilterState;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [density, setDensity] = useState<EnterpriseDataTableDensity>(defaultDensity);

  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(() =>
    columns.filter((column) => column.defaultHidden).map((column) => String(column.key))
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumnKeys.includes(String(column.key))),
    [columns, hiddenColumnKeys]
  );

  const filteredByEnterpriseFilters = useMemo(() => {
    if (!filters) return data;

    return applyEnterpriseFilters(data, filters, filterDefinitions);
  }, [data, filters, filterDefinitions]);

  const filteredRows = useMemo(
    () => filterRows(filteredByEnterpriseFilters, columns, search),
    [filteredByEnterpriseFilters, columns, search]
  );

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDirection),
    [filteredRows, sortKey, sortDirection]
  );

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  const visibleRows = useMemo(
    () => paginateRows(sortedRows, page, pageSize),
    [sortedRows, page, pageSize]
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSort(key: string, sortable?: boolean) {
    if (!sortable) return;

    setPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function toggleColumn(key: string) {
    const column = columns.find((item) => String(item.key) === key);

    if (!column?.hideable) return;

    setHiddenColumnKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  return {
    search,
    page,
    totalPages,
    sortKey,
    sortDirection,
    density,
    columns: visibleColumns,
    allColumns: columns,
    hiddenColumnKeys,
    rows: visibleRows,
    totalRows: sortedRows.length,
    setPage,
    setDensity,
    handleSearch,
    handleSort,
    toggleColumn,
  };
}
