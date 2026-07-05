import { EnterpriseFilterDefinition, EnterpriseFilterState, EnterpriseFilterValue } from "../types";

export function isEmptyFilterValue(value: EnterpriseFilterValue) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim().length === 0;

  if (typeof value === "object") {
    return !value.from && !value.to;
  }

  return false;
}

export function compactFilters(filters: EnterpriseFilterState) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => !isEmptyFilterValue(value))
  ) as EnterpriseFilterState;
}

export function getActiveFilterCount(filters: EnterpriseFilterState) {
  return Object.values(filters).filter((value) => !isEmptyFilterValue(value)).length;
}

export function createInitialFilterState(
  definitions: EnterpriseFilterDefinition[]
): EnterpriseFilterState {
  return definitions.reduce<EnterpriseFilterState>((acc, definition) => {
    if (definition.type === "multi_select") {
      acc[definition.key] = [];
      return acc;
    }

    if (definition.type === "boolean") {
      acc[definition.key] = null;
      return acc;
    }

    acc[definition.key] = "";
    return acc;
  }, {});
}

export function normalizeFilterValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
}

export function applyClientFilters<T>(
  rows: T[],
  filters: EnterpriseFilterState,
  definitions: EnterpriseFilterDefinition[]
) {
  const compacted = compactFilters(filters);

  if (Object.keys(compacted).length === 0) return rows;

  return rows.filter((row) =>
    definitions.every((definition) => {
      const filterValue = compacted[definition.key];

      if (isEmptyFilterValue(filterValue)) return true;

      const rowValue = (row as Record<string, unknown>)[definition.key];
      const normalizedRowValue = normalizeFilterValue(rowValue);

      if (definition.type === "multi_select" && Array.isArray(filterValue)) {
        return filterValue.includes(String(rowValue));
      }

      if (definition.type === "select") {
        return String(rowValue) === String(filterValue);
      }

      if (definition.type === "boolean") {
        return Boolean(rowValue) === Boolean(filterValue);
      }

      if (definition.type === "number") {
        return Number(rowValue) === Number(filterValue);
      }

      return normalizedRowValue.includes(normalizeFilterValue(filterValue));
    })
  );
}

export function applyEnterpriseFilters<T>(
  rows: T[],
  filters: EnterpriseFilterState,
  definitions?: EnterpriseFilterDefinition[]
) {
  const inferredDefinitions =
    definitions ??
    Object.keys(filters).map((key) => ({
      key,
      label: key,
      type: "text" as const,
    }));

  return applyClientFilters(rows, filters, inferredDefinitions);
}
