import type { FormField } from "@/features/forms/types";
import { isFieldVisible } from "@/features/forms/utils/field-visibility";
import { isResponsiblePersonField } from "@/features/forms/utils/system-fields";
import type { ChecklistScore, TaskFormResponses } from "@/features/tasks/types";

const YES_VALUES = new Set(["yes", "ya", "true", "1"]);
const NO_VALUES = new Set(["no", "tidak", "false", "0"]);
const NA_VALUES = new Set(["n/a", "na", "tidak berlaku", "tidak_berlaku"]);
const SELECT_FAIL_VALUES = new Set(["fail", "gagal", "rejected", "not ready", "critical issue"]);
const SELECT_PASS_VALUES = new Set([
  "pass",
  "lulus",
  "approved",
  "ready",
  "controlled",
  "ready for tomorrow",
  "recorded",
]);

function normalizeText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

function isFilled(value: unknown) {
  return Boolean(normalizeText(value));
}

function isNaValue(value: unknown) {
  return NA_VALUES.has(normalizeText(value).toLowerCase());
}

function fieldAllowsNa(field: FormField) {
  return field.options?.allow_na === true;
}

function getFieldWeight(field: FormField) {
  const weight = field.validation?.weight;
  if (weight != null && Number.isFinite(weight) && weight > 0) {
    return weight;
  }
  return 1;
}

function isCriticalField(field: FormField) {
  return field.validation?.critical === true;
}

function extractBounds(field: FormField): { min?: number; max?: number } {
  return {
    min:
      field.validation?.min != null && Number.isFinite(field.validation.min)
        ? field.validation.min
        : undefined,
    max:
      field.validation?.max != null && Number.isFinite(field.validation.max)
        ? field.validation.max
        : undefined,
  };
}

function scoreYesNo(value: unknown, allowNa: boolean): { passed: boolean | null; reason?: string } {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return { passed: null, reason: "No answer provided" };
  if (allowNa && NA_VALUES.has(normalized)) return { passed: null };
  if (YES_VALUES.has(normalized)) return { passed: true };
  if (NO_VALUES.has(normalized)) return { passed: false, reason: "Answered no" };
  return { passed: false, reason: `Invalid yes/no value: ${value}` };
}

function scoreNumber(
  field: FormField,
  value: unknown
): { passed: boolean | null; reason?: string } {
  const normalized = normalizeText(value);
  if (!normalized) return { passed: null, reason: "No answer provided" };

  const numeric = Number(normalized.replace(",", ""));
  if (!Number.isFinite(numeric)) return { passed: false, reason: `Invalid number: ${value}` };

  const { min, max } = extractBounds(field);
  if (min != null && numeric < min) {
    return { passed: false, reason: `Value ${numeric} below minimum ${min}` };
  }
  if (max != null && numeric > max) {
    return { passed: false, reason: `Value ${numeric} above maximum ${max}` };
  }
  return { passed: true };
}

function scoreRating(
  field: FormField,
  value: unknown
): { passed: boolean | null; reason?: string } {
  const normalized = normalizeText(value);
  if (!normalized) return { passed: null, reason: "No answer provided" };

  const rating = Number(normalized.replace(",", ""));
  if (!Number.isFinite(rating)) return { passed: false, reason: `Invalid rating: ${value}` };

  const maxStars = Math.max(1, field.options?.maxStars ?? 5);
  if (rating < 1 || rating > maxStars) {
    return { passed: false, reason: `Rating ${rating} outside range 1-${maxStars}` };
  }

  const threshold = field.validation?.min ?? 3;
  if (rating >= threshold) return { passed: true };
  return { passed: false, reason: `Rating ${rating} below threshold ${threshold}` };
}

function scoreField(field: FormField, value: unknown): { passed: boolean | null; reason?: string } {
  const allowNa = fieldAllowsNa(field);

  if (!isFilled(value) && !field.required) {
    return { passed: null };
  }

  switch (field.type) {
    case "yes_no":
      return scoreYesNo(value, allowNa);
    case "number":
    case "money_amount":
      return scoreNumber(field, value);
    case "rating":
      return scoreRating(field, value);
    case "barcode":
    case "photo":
    case "signature":
      return isFilled(value)
        ? { passed: true }
        : { passed: false, reason: "Required evidence missing" };
    case "select": {
      if (!isFilled(value)) return { passed: false, reason: "Required field empty" };
      const choices = field.options?.choices ?? [];
      const normalized = normalizeText(value);
      if (choices.length > 0) {
        const choiceSet = new Set(choices.map((item) => normalizeText(item).toLowerCase()));
        if (!choiceSet.has(normalized.toLowerCase()) && !choices.includes(normalized)) {
          return { passed: false, reason: `Invalid selection: ${value}` };
        }
      }
      const lower = normalized.toLowerCase();
      if (NA_VALUES.has(lower)) return { passed: null };
      if (SELECT_FAIL_VALUES.has(lower)) {
        return { passed: false, reason: `Failed check: ${value}` };
      }
      if (SELECT_PASS_VALUES.has(lower)) return { passed: true };
      return { passed: true };
    }
    case "date":
    case "time":
      return isFilled(value) ? { passed: true } : { passed: false, reason: "Required field empty" };
    default:
      return isFilled(value) ? { passed: true } : { passed: false, reason: "Required field empty" };
  }
}

export function scoreChecklistClientSide(args: {
  fields: FormField[];
  responses: TaskFormResponses;
  passThreshold?: number;
}): ChecklistScore {
  const passThreshold = Math.max(1, Math.min(100, args.passThreshold ?? 80));
  let passedCount = 0;
  let failedCount = 0;
  let totalScorable = 0;
  let naCount = 0;
  let totalWeight = 0;
  let passedWeight = 0;
  const failedItems: ChecklistScore["failed_items"] = [];
  const criticalFailures: ChecklistScore["failed_items"] = [];

  for (const field of args.fields) {
    if (isResponsiblePersonField(field)) continue;
    if (!isFieldVisible(field, args.responses)) continue;

    const value = args.responses[field.id];
    const allowNa = fieldAllowsNa(field);
    const selectAllowsNa = (field.options?.choices ?? []).some((item) =>
      NA_VALUES.has(normalizeText(item).toLowerCase())
    );

    if (field.type === "yes_no" && allowNa && isNaValue(value)) {
      naCount += 1;
      continue;
    }

    if (field.type === "select" && selectAllowsNa && isNaValue(value)) {
      naCount += 1;
      continue;
    }

    const { passed, reason } = scoreField(field, value);
    if (passed == null) continue;

    const weight = getFieldWeight(field);
    const critical = isCriticalField(field);
    totalScorable += 1;
    totalWeight += weight;

    if (passed) {
      passedCount += 1;
      passedWeight += weight;
    } else {
      failedCount += 1;
      const item = {
        field_id: Number(field.id) || 0,
        label: field.label,
        value: normalizeText(value) || null,
        reason: reason ?? "Failed",
        critical,
      };
      failedItems.push(item);
      if (critical) {
        criticalFailures.push({ ...item, critical: true });
      }
    }
  }

  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;

  let status: ChecklistScore["status"];
  if (criticalFailures.length > 0) {
    status = "fail";
  } else if (score >= passThreshold) {
    status = "pass";
  } else if (failedCount > 0) {
    status = "fail";
  } else {
    status = "attention";
  }

  return {
    score,
    passed_count: passedCount,
    failed_count: failedCount,
    total_scorable: totalScorable,
    na_count: naCount,
    failed_items: failedItems,
    critical_failures: criticalFailures,
    status,
  };
}
