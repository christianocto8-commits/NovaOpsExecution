import { FormField } from "@/features/forms/types";
import {
  isMoneyAmountFilled,
  isMoneyDenominationFilled,
} from "@/features/forms/utils/money";
import { TaskFormResponses } from "@/features/tasks/types";

function isFieldFilled(field: FormField, responses: TaskFormResponses) {
  const value = responses[field.id];

  if (field.type === "money_denomination") {
    return isMoneyDenominationFilled(value ?? "");
  }

  if (field.type === "money_amount") {
    return isMoneyAmountFilled(value ?? "");
  }

  return Boolean(value && value.trim());
}

export function getMissingRequiredFields(fields: FormField[], responses: TaskFormResponses) {
  return fields.filter((field) => field.required && !isFieldFilled(field, responses));
}

export function isFormResponseComplete(fields: FormField[], responses: TaskFormResponses) {
  return getMissingRequiredFields(fields, responses).length === 0;
}
