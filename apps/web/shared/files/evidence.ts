import { TaskEvidence, TaskEvidenceType } from "@/features/tasks/types";

export function createMockEvidence(params: {
  type: TaskEvidenceType;
  value: string;
  label?: string;
  submittedAt?: string;
}): TaskEvidence {
  return {
    id: `EVD-${Date.now()}`,
    type: params.type,
    label: params.label,
    value: params.value,
    submittedAt: params.submittedAt ?? "Just now",
  };
}

export function detectEvidenceType(value: string): TaskEvidenceType {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.startsWith("http://") || normalizedValue.startsWith("https://")) {
    return "url";
  }

  if (
    normalizedValue.endsWith(".jpg") ||
    normalizedValue.endsWith(".jpeg") ||
    normalizedValue.endsWith(".png") ||
    normalizedValue.endsWith(".webp")
  ) {
    return "photo";
  }

  if (
    normalizedValue.endsWith(".pdf") ||
    normalizedValue.endsWith(".doc") ||
    normalizedValue.endsWith(".docx") ||
    normalizedValue.endsWith(".xlsx")
  ) {
    return "document";
  }

  return "note";
}
