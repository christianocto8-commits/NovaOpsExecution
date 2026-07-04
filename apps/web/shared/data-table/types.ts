import { ReactNode } from "react";
import {
  EnterpriseFilterDefinition,
  EnterpriseFilterState,
} from "@/shared/filters";

export type EnterpriseColumn<T> = {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T) => ReactNode;
};

export type EnterpriseDataTableDensity = "comfortable" | "compact";

export type EnterpriseDataTableProps<T> = {
  title?: string;
  description?: string;
  columns: EnterpriseColumn<T>[];
  data: T[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  getRowId?: (row: T, index: number) => string;
  actions?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  defaultDensity?: EnterpriseDataTableDensity;

  filterDefinitions?: EnterpriseFilterDefinition[];
  filters?: EnterpriseFilterState;
  onFiltersChange?: (filters: EnterpriseFilterState) => void;
  enableFilters?: boolean;
  enableSavedViews?: boolean;
  savedViewScope?: string;
};
