export type EnterpriseFilterValue = string | string[] | null;

export type EnterpriseFilterOption = {
  label: string;
  value: string;
};

export type EnterpriseFilterDefinition = {
  key: string;
  label: string;
  placeholder?: string;
  options: EnterpriseFilterOption[];
};

export type EnterpriseFilterState = Record<string, EnterpriseFilterValue>;
