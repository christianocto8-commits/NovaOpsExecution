export type FormFieldType =
  | "text"
  | "textarea"
  | "yes_no"
  | "number"
  | "photo"
  | "signature";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
};

export type FormTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "Active" | "Draft" | "Archived";
  fields: FormField[];
};
