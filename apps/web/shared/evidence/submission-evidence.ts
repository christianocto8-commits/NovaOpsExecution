import type { TaskEvidence } from "@/features/tasks/types";
import { createTaskEvidence, detectEvidenceType } from "@/shared/files";
import { buildApiUrl } from "@/lib/api-url";
import { isOfflineEvidenceUrl } from "@/lib/offline/offline-evidence";

import type { EvidenceItem } from "./types";
import { getPhotoDisplayUrl, parsePhotoFieldValue, parsePhotoFieldValues } from "./photo-value";

function isPhotoUrl(url: string) {
  return /uploads\/evidence|evidence-uploads|\.(jpg|jpeg|png|webp|heic|heif|mp4|webm|mov)(\?|$)/i.test(
    url
  );
}

export function normalizeEvidenceUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const parsed = parsePhotoFieldValue(trimmed);
  return (parsed?.url ?? getPhotoDisplayUrl(trimmed)).trim();
}

export function resolveEvidenceDisplayUrl(url: string) {
  const normalized = normalizeEvidenceUrl(url);
  if (!normalized) return "";

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    isOfflineEvidenceUrl(normalized)
  ) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/") || normalized.startsWith("/api/")) {
    return buildApiUrl(normalized);
  }

  return normalized;
}

export function parseEvidenceGallery(value: string): EvidenceItem[] {
  if (!value.trim()) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is EvidenceItem =>
          Boolean(item) && typeof item.id === "string" && typeof item.url === "string"
      )
      .map((item) => ({
        ...item,
        url: resolveEvidenceDisplayUrl(item.url),
      }))
      .filter((item) => Boolean(item.url.trim()));
  } catch {
    return [];
  }
}

export function buildTaskEvidenceFromText(value: string, submittedAt: string): TaskEvidence[] {
  const galleryItems = parseEvidenceGallery(value);

  if (galleryItems.length > 0) {
    return galleryItems.map((item) =>
      createTaskEvidence({
        type: detectEvidenceType(item.url),
        label: item.caption || "Outlet Evidence",
        value: item.url,
        submittedAt: item.uploadedAt ?? submittedAt,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy_m: item.accuracy_m,
      })
    );
  }

  const resolvedValue = value.trim() ? resolveEvidenceDisplayUrl(value) : "";

  return [
    createTaskEvidence({
      type: resolvedValue ? detectEvidenceType(resolvedValue) : "note",
      label: resolvedValue ? "Outlet Evidence" : "Execution Confirmation",
      value: resolvedValue || "Execution completed without additional evidence attachment.",
      submittedAt,
    }),
  ];
}

function parseEvidencePayload(payload: unknown): EvidenceItem[] {
  if (typeof payload === "string") {
    return parseEvidenceGallery(payload);
  }

  if (!Array.isArray(payload)) return [];

  return payload
    .filter(
      (item): item is EvidenceItem =>
        Boolean(item) && typeof item.id === "string" && typeof item.url === "string"
    )
    .map((item) => ({
      ...item,
      url: resolveEvidenceDisplayUrl(item.url),
    }))
    .filter((item) => Boolean(item.url.trim()));
}

export function collectSubmissionEvidenceItems(args: {
  evidencePayload?: unknown;
  formResponses?: Record<string, string>;
  taskEvidence?: TaskEvidence[];
  submissionAnswers?: Array<{
    form_field_id: number;
    answer_text?: string | null;
    answer_number?: number | null;
    answer_boolean?: boolean | null;
    answer_json?: unknown;
    evidence_url?: string | null;
  }>;
}): EvidenceItem[] {
  const seen = new Set<string>();
  const items: EvidenceItem[] = [];

  function add(item: EvidenceItem) {
    const normalized = normalizeEvidenceUrl(item.url);
    if (!normalized || !isPhotoUrl(normalized) || seen.has(normalized)) return;

    seen.add(normalized);
    items.push({
      ...item,
      url: resolveEvidenceDisplayUrl(normalized),
    });
  }

  parseEvidencePayload(args.evidencePayload).forEach((item) => add(item));

  (args.submissionAnswers ?? []).forEach((answer) => {
    const rawUrl =
      answer.evidence_url?.trim() ||
      answer.answer_text?.trim() ||
      (typeof answer.answer_json === "string" ? answer.answer_json.trim() : "");

    if (!rawUrl) return;

    const photoValues = parsePhotoFieldValues(rawUrl);

    photoValues.forEach((photoValue, index) => {
      const url = photoValue?.url ?? getPhotoDisplayUrl(rawUrl);
      if (!url || !isPhotoUrl(url)) return;

      add({
        id: `submission-${answer.form_field_id}-${index}`,
        url,
        caption: `Form field ${answer.form_field_id}`,
        latitude: photoValue?.latitude,
        longitude: photoValue?.longitude,
        accuracy_m: photoValue?.accuracy_m,
      });
    });
  });

  (args.taskEvidence ?? [])
    .filter((item) => (item.type === "photo" || item.type === "url") && item.value.trim())
    .forEach((item) =>
      add({
        id: item.id,
        url: item.value,
        caption: item.label,
        uploadedAt: item.submittedAt,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy_m: item.accuracy_m,
      })
    );

  Object.entries(args.formResponses ?? {}).forEach(([fieldId, value]) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return;

    const photoValues = parsePhotoFieldValues(trimmed);

    photoValues.forEach((photoValue, index) => {
      const url = photoValue?.url ?? getPhotoDisplayUrl(trimmed);
      if (!url || !isPhotoUrl(url)) return;

      add({
        id: `form-${fieldId}-${index}`,
        url,
        caption: `Form field ${fieldId}`,
        latitude: photoValue?.latitude,
        longitude: photoValue?.longitude,
        accuracy_m: photoValue?.accuracy_m,
      });
    });
  });

  return items;
}

export function hiddenMediaFieldIds(
  formResponses: Record<string, string>,
  evidenceItems: EvidenceItem[]
) {
  const evidenceUrls = new Set(evidenceItems.map((item) => normalizeEvidenceUrl(item.url)));

  return Object.entries(formResponses)
    .filter(([, value]) => {
      const trimmed = String(value ?? "").trim();
      if (!trimmed) return false;

      const url = normalizeEvidenceUrl(trimmed);
      return Boolean(url) && evidenceUrls.has(url);
    })
    .map(([fieldId]) => fieldId);
}
