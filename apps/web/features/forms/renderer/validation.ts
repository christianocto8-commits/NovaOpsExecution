import { FormField } from "@/features/forms/types";
import { TaskFormResponses } from "@/features/tasks/types";

export function getMissingRequiredFields(fields: FormField[], responses: TaskFormResponses) {
  return fields.filter((field) => {
    if (!field.required) return false;

    const value = responses[field.id];

    return !value || !value.trim();
  });
}

export function isFormResponseComplete(fields: FormField[], responses: TaskFormResponses) {
  return getMissingRequiredFields(fields, responses).length === 0;
}
