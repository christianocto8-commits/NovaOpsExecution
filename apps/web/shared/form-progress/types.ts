export type ProgressField = {
  id: string;
  label?: string;
  required?: boolean;
  hidden?: boolean;
  disabled?: boolean;
};

export type ProgressResult = {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
};
