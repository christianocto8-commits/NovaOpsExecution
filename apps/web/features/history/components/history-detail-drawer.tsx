"use client";

import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { SectionedFormRenderer } from "@/features/forms/renderer";
import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import type { ExecutionSessionResponse } from "@/services/execution-session.service";
import type { FormSubmissionResponse } from "@/services/form-submission.service";
import { formTemplateService } from "@/services/form-template.service";
import { EvidenceGallery, type EvidenceItem } from "@/shared/evidence";

export type HistoryDetailSelection =
  | { kind: "task"; task: Task }
  | { kind: "session"; session: ExecutionSessionResponse; taskTitle: string }
  | { kind: "form"; submission: FormSubmissionResponse; templateName: string };

type HistoryDetailDrawerProps = {
  selection: HistoryDetailSelection | null;
  onClose: () => void;
};

function parseResponses(answersJson: Record<string, unknown>) {
  const responses = answersJson.responses;
  if (!responses || typeof responses !== "object") return {};

  return Object.fromEntries(
    Object.entries(responses as Record<string, unknown>).map(([key, value]) => [
      key,
      value == null ? "" : String(value),
    ])
  );
}

function parseEvidenceItems(value: unknown): EvidenceItem[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is EvidenceItem =>
        Boolean(item) && typeof item.id === "string" && typeof item.url === "string"
    );
  } catch {
    return [];
  }
}

function parseChecklist(answersJson: Record<string, unknown>) {
  const checklist = answersJson._checklist;
  if (!checklist || typeof checklist !== "object") return null;

  const payload = checklist as Record<string, unknown>;
  const status = payload.status;

  if (status !== "pass" && status !== "attention" && status !== "fail") return null;

  return {
    score: typeof payload.score === "number" ? payload.score : Number(payload.score ?? 0),
    status,
    failed_items: Array.isArray(payload.failed_items) ? payload.failed_items : [],
  };
}

export function HistoryDetailDrawer({ selection, onClose }: HistoryDetailDrawerProps) {
  const templateId =
    selection?.kind === "session"
      ? selection.session.form_template_id
      : selection?.kind === "form"
        ? selection.submission.form_template_id
        : selection?.kind === "task" && selection.task.formTemplateId
          ? selection.task.formTemplateId
          : null;

  const templateQuery = useQuery({
    queryKey: [...queryKeys.sop.formTemplates(), templateId],
    queryFn: () => formTemplateService.get(String(templateId)),
    enabled: Boolean(templateId),
  });

  if (!selection) return null;

  const template = templateQuery.data ?? null;
  const answersJson: Record<string, unknown> =
    selection.kind === "session"
      ? selection.session.answers_json
      : selection.kind === "task" && selection.task.execution
        ? { responses: selection.task.execution.formResponses }
        : {};

  const responses =
    selection.kind === "form"
      ? Object.fromEntries(
          selection.submission.answers.map((answer) => [
            String(answer.form_field_id),
            answer.answer_text ??
              (answer.answer_number != null ? String(answer.answer_number) : "") ??
              "",
          ])
        )
      : parseResponses(answersJson as Record<string, unknown>);

  const checklist =
    selection.kind === "session"
      ? parseChecklist(selection.session.answers_json)
      : selection.kind === "task"
        ? (selection.task.execution?.checklist ?? null)
        : null;

  const evidenceItems: EvidenceItem[] =
    selection.kind === "task" && selection.task.execution
      ? selection.task.execution.evidence
          .filter((item) => item.type === "photo" && item.value.trim())
          .map((item) => ({
            id: item.id,
            url: item.value,
            latitude: item.latitude,
            longitude: item.longitude,
            accuracy_m: item.accuracy_m,
          }))
      : parseEvidenceItems((answersJson as Record<string, unknown>).evidence);

  const title =
    selection.kind === "task"
      ? selection.task.title
      : selection.kind === "session"
        ? selection.taskTitle
        : selection.templateName;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40">
      <button type="button" className="flex-1" aria-label="Close detail" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Submission Detail
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {checklist ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Checklist Score
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-950">{checklist.score}%</p>
              <p className="mt-1 text-sm capitalize text-slate-600">Status: {checklist.status}</p>
            </section>
          ) : null}

          {template ? (
            <SectionedFormRenderer
              fields={template.fields}
              responses={responses}
              onChange={() => undefined}
              readOnly
            />
          ) : templateQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading form fields…</p>
          ) : null}

          {evidenceItems.length > 0 ? (
            <section>
              <p className="mb-3 text-sm font-bold text-slate-800">Evidence</p>
              <EvidenceGallery value={evidenceItems} onChange={() => undefined} readOnly />
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
