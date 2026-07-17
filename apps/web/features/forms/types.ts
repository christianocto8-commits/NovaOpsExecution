export type FormFieldType =
  | "text"
  | "textarea"
  | "yes_no"
  | "number"
  | "photo"
  | "signature"
  | "money_denomination"
  | "money_amount";

export type FormFieldOptions = {
  denominations?: number[];
  currency?: string;
};

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  section?: string;
  options?: FormFieldOptions;
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
