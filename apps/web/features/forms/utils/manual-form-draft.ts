import type { TaskFormResponses } from "@/features/tasks/types";

const MANUAL_FORM_DRAFTS_KEY = "novaops-manual-form-drafts";

export type ManualFormDraft = {
  responses: TaskFormResponses;
  updatedAt: string;
};

type DraftMap = Record<string, ManualFormDraft>;

function readDrafts(): DraftMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(MANUAL_FORM_DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as DraftMap) : {};
  } catch {
    return {};
  }
}

function writeDrafts(drafts: DraftMap) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MANUAL_FORM_DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Storage penuh / tidak tersedia — abaikan agar tidak memblokir submit.
  }
}

export function saveManualFormDraft(templateId: string, responses: TaskFormResponses) {
  const drafts = readDrafts();
  drafts[templateId] = { responses, updatedAt: new Date().toISOString() };
  writeDrafts(drafts);
}

export function getManualFormDraft(templateId: string): ManualFormDraft | null {
  return readDrafts()[templateId] ?? null;
}

export function clearManualFormDraft(templateId: string) {
  const drafts = readDrafts();
  if (!drafts[templateId]) return;

  delete drafts[templateId];
  writeDrafts(drafts);
}
