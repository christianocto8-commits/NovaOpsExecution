import { FormField } from "@/features/forms/types";
import { getVisibleFields } from "@/features/forms/utils/field-visibility";
import { isMoneyAmountFilled, isMoneyDenominationFilled } from "@/features/forms/utils/money";
import {
  getResponsiblePersonField,
  isResponsiblePersonField,
  isResponsiblePersonFilled,
} from "@/features/forms/utils/system-fields";
import { TaskFormResponses } from "@/features/tasks/types";

function isFieldFilled(field: FormField, responses: TaskFormResponses) {
  const value = responses[field.id] ?? "";

  if (isResponsiblePersonField(field)) {
    return isResponsiblePersonFilled([field], responses);
  }

  if (field.type === "money_denomination") {
    return isMoneyDenominationFilled(value);
  }

  if (field.type === "money_amount") {
    return isMoneyAmountFilled(value);
  }

  if (field.type === "photo" || field.type === "video" || field.type === "signature") {
    return value.trim().length > 0;
  }

  if (field.type === "rating") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0;
  }

  if (field.type === "barcode") {
    return value.trim().length > 0;
  }

  return Boolean(value.trim());
}

export function getMissingRequiredFields(fields: FormField[], responses: TaskFormResponses) {
  const visibleFields = getVisibleFields(fields, responses);
  const missingTemplateFields = visibleFields.filter(
    (field) => field.required && !isFieldFilled(field, responses)
  );

  if (getResponsiblePersonField(fields)) {
    return missingTemplateFields;
  }

  if (!isResponsiblePersonFilled(fields, responses)) {
    return [
      {
        id: "__responsible_person__",
        label: "Nama pelaksana / PIC",
        type: "responsible_person" as const,
        required: true,
      },
      ...missingTemplateFields,
    ];
  }

  return missingTemplateFields;
}

export function isFormResponseComplete(fields: FormField[], responses: TaskFormResponses) {
  return getMissingRequiredFields(fields, responses).length === 0;
}
