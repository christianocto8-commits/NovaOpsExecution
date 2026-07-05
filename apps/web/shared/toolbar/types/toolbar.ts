export type EnterpriseToolbarAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

export type EnterpriseToolbarProps = {
  title?: string;
  description?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: EnterpriseToolbarAction[];
};
