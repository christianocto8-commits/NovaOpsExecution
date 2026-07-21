export type FormFieldType =
  | "text"
  | "textarea"
  | "yes_no"
  | "number"
  | "select"
  | "date"
  | "time"
  | "photo"
  | "signature"
  | "rating"
  | "barcode"
  | "money_denomination"
  | "money_amount"
  | "responsible_person";

export type FieldVisibilityOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_empty"
  | "is_not_empty";

export type FieldVisibilityRule = {
  fieldId: string;
  operator: FieldVisibilityOperator;
  value?: string;
};

export type FormFieldOptions = {
  denominations?: number[];
  currency?: string;
  system?: boolean;
  /** @deprecated use visibilityRule */
  showWhenFieldId?: string;
  /** @deprecated use visibilityRule */
  showWhenValue?: string;
  visibilityRule?: FieldVisibilityRule;
  choices?: string[];
  allow_na?: boolean;
  maxStars?: number;
  lowLabel?: string;
  highLabel?: string;
};

export type FormFieldValidation = {
  min?: number;
  max?: number;
  weight?: number;
  critical?: boolean;
};

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  section?: string;
  options?: FormFieldOptions;
  validation?: FormFieldValidation;
};

export type FormTemplate = {
  id: string;
  name: string;
  category: string;
  urgency?: "Low" | "Medium" | "High" | "Critical";
  description: string;
  status: "Active" | "Draft" | "Archived";
  fields: FormField[];
};
