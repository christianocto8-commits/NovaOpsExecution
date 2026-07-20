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
  | "money_denomination"
  | "money_amount"
  | "responsible_person";

export type FormFieldOptions = {
  denominations?: number[];
  currency?: string;
  system?: boolean;
  showWhenFieldId?: string;
  showWhenValue?: string;
  choices?: string[];
};

export type FormFieldValidation = {
  min?: number;
  max?: number;
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
