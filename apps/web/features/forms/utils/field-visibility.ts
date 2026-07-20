import type { FormField } from "@/features/forms/types";
import type { TaskFormResponses } from "@/features/tasks/types";

function normalizeYesNo(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "ya" || normalized === "true") return "yes";
  if (normalized === "no" || normalized === "tidak" || normalized === "false") return "no";
  return normalized;
}

export function isFieldVisible(
  field: FormField,
  responses: TaskFormResponses
): boolean {
  const showWhenFieldId = field.options?.showWhenFieldId;
  if (!showWhenFieldId) return true;

  const expected = normalizeYesNo(field.options?.showWhenValue ?? "yes");
  const actual = normalizeYesNo(responses[showWhenFieldId] ?? "");

  if (!actual) return false;

  return actual === expected;
}

export function getVisibleFields(fields: FormField[], responses: TaskFormResponses) {
  return fields.filter((field) => isFieldVisible(field, responses));
}
