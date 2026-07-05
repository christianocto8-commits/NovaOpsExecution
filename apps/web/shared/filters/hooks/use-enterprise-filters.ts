"use client";

import { useMemo, useState } from "react";

import { EnterpriseFilterDefinition, EnterpriseFilterState, EnterpriseFilterValue } from "../types";
import {
  compactFilters,
  createInitialFilterState,
  getActiveFilterCount,
} from "../utils/filter-utils";

export function useEnterpriseFilters({
  definitions,
  defaultFilters,
}: {
  definitions: EnterpriseFilterDefinition[];
  defaultFilters?: EnterpriseFilterState;
}) {
  const initialState = useMemo(
    () => ({
      ...createInitialFilterState(definitions),
      ...(defaultFilters ?? {}),
    }),
    [definitions, defaultFilters]
  );

  const [filters, setFilters] = useState<EnterpriseFilterState>(initialState);

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const compactedFilters = useMemo(() => compactFilters(filters), [filters]);

  function updateFilter(key: string, value: EnterpriseFilterValue) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFilter(key: string) {
    const definition = definitions.find((item) => item.key === key);

    if (!definition) return;

    const emptyValue =
      definition.type === "multi_select" ? [] : definition.type === "boolean" ? null : "";

    setFilters((current) => ({
      ...current,
      [key]: emptyValue,
    }));
  }

  function resetFilters() {
    setFilters(createInitialFilterState(definitions));
  }

  return {
    filters,
    compactedFilters,
    activeFilterCount,
    setFilters,
    updateFilter,
    clearFilter,
    resetFilters,
  };
}
