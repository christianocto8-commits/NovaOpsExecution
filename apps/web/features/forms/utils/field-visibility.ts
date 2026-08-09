import type {
  FieldVisibilityOperator,
  FieldVisibilityRule,
  FormField,
} from "@/features/forms/types";
import type { TaskFormResponses } from "@/features/tasks/types";

function normalizeComparable(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "ya" || normalized === "true" || normalized === "1") {
    return "yes";
  }
  if (
    normalized === "no" ||
    normalized === "tidak" ||
    normalized === "false" ||
    normalized === "0"
  ) {
    return "no";
  }
  if (normalized === "fail" || normalized === "gagal") {
    return "fail";
  }
  if (normalized === "pass" || normalized === "lulus") {
    return "pass";
  }
  return normalized;
}

export function resolveVisibilityRule(field: FormField): FieldVisibilityRule | null {
  const rule = field.options?.visibilityRule;
  if (rule?.fieldId) {
    return rule;
  }

  const legacyFieldId = field.options?.showWhenFieldId;
  if (!legacyFieldId) return null;

  return {
    fieldId: legacyFieldId,
    operator: "equals",
    value: field.options?.showWhenValue ?? "yes",
  };
}

function evaluateOperator(
  operator: FieldVisibilityOperator,
  actual: string,
  expected: string
): boolean {
  switch (operator) {
    case "is_empty":
      return actual.length === 0;
    case "is_not_empty":
      return actual.length > 0;
    case "equals":
      return normalizeComparable(actual) === normalizeComparable(expected);
    case "not_equals":
      return normalizeComparable(actual) !== normalizeComparable(expected);
    case "contains":
      return normalizeComparable(actual).includes(normalizeComparable(expected));
    default:
      return true;
  }
}

export function isFieldVisible(field: FormField, responses: TaskFormResponses): boolean {
  const rule = resolveVisibilityRule(field);
  if (!rule) return true;

  const actual = (responses[rule.fieldId] ?? "").trim();
  const expected = (rule.value ?? "").trim();
  const operator = rule.operator ?? "equals";

  if (operator === "is_empty" || operator === "is_not_empty") {
    return evaluateOperator(operator, actual, expected);
  }

  if (!actual && operator !== "equals" && operator !== "not_equals") {
    return false;
  }

  return evaluateOperator(operator, actual, expected);
}

export function getVisibleFields(fields: FormField[], responses: TaskFormResponses) {
  return fields.filter((field) => isFieldVisible(field, responses));
}

export const visibilityOperatorLabels: Record<FieldVisibilityOperator, string> = {
  equals: "sama dengan",
  not_equals: "tidak sama dengan",
  contains: "mengandung",
  is_empty: "kosong",
  is_not_empty: "tidak kosong",
};
