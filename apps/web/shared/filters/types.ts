export type EnterpriseFilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_empty"
  | "is_not_empty";

export type EnterpriseFilterType =
  | "text"
  | "select"
  | "multi_select"
  | "number"
  | "date"
  | "boolean";

export type EnterpriseFilterOption = {
  label: string;
  value: string;
};

export type EnterpriseFilterDefinition = {
  key: string;
  label: string;
  type: EnterpriseFilterType;
  operator?: EnterpriseFilterOperator;
  options?: EnterpriseFilterOption[];
  placeholder?: string;
};

export type EnterpriseFilterValue =
  | string
  | number
  | boolean
  | string[]
  | {
      from?: string | number;
      to?: string | number;
    }
  | null;

export type EnterpriseFilterState = Record<string, EnterpriseFilterValue>;

export type EnterpriseFilterChangeHandler = (
  nextFilters: EnterpriseFilterState
) => void;

export type EnterpriseSavedView = {
  id: string;
  name: string;
  filters: EnterpriseFilterState;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
};
