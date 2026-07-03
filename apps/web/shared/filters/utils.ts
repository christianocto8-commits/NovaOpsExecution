import { EnterpriseFilterState } from "./types/filter";

export function applyEnterpriseFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: EnterpriseFilterState,
) {
  return data.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;

      const itemValue = item[key];

      if (Array.isArray(value)) {
        return value.includes(String(itemValue));
      }

      return String(itemValue) === String(value);
    });
  });
}