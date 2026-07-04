import { ProgressField, ProgressResult } from "./types";

function isFilled(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;

  return false;
}

export function calculateFormProgress(
  fields: ProgressField[],
  values: Record<string, unknown>
): ProgressResult {
  const activeRequiredFields = fields.filter(
    (field) => field.required && !field.hidden && !field.disabled
  );

  const total = activeRequiredFields.length;

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      remaining: 0,
      percentage: 100,
    };
  }

  const completed = activeRequiredFields.filter((field) =>
    isFilled(values[field.id])
  ).length;

  const remaining = total - completed;
  const percentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    remaining,
    percentage,
  };
}
