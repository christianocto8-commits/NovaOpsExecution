"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { SectionedFormRenderer } from "@/features/forms/renderer";
import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import type { ExecutionSessionResponse } from "@/services/execution-session.service";
import { getExecutionSessions } from "@/services/execution-session.service";
import { formSubmissionService, type FormSubmissionResponse } from "@/services/form-submission.service";
import { formTemplateService } from "@/services/form-template.service";
import {
  fetchHistoryNotes,
  saveHistoryNotes,
} from "@/services/notification-preferences.service";
import { EvidenceGallery } from "@/shared/evidence";
import {
  collectSubmissionEvidenceItems,
  hiddenMediaFieldIds,
} from "@/shared/evidence/submission-evidence";
import { TaskPdfExportButton } from "@/features/reports/components/task-pdf-export-button";
import { isTaskWorkedOn } from "@/features/tasks/utils/task-inbox";

export type HistoryDetailSelection =
  | { kind: "task"; task: Task }
  | { kind: "session"; session: ExecutionSessionResponse; taskTitle: string }
  | { kind: "form"; submission: FormSubmissionResponse; templateName: string };

type HistoryDetailDrawerProps = {
  selection: HistoryDetailSelection | null;
  onClose: () => void;
  enrichedTasks?: Task[];
};

const NOTES_STORAGE_KEY = "novaops_history_notes";

function getNoteKey(selection: HistoryDetailSelection) {
  if (selection.kind === "task") return `task:${selection.task.id}`;
  if (selection.kind === "session") return `session:${selection.session.id}`;
  return `form:${selection.submission.id}`;
}

function readStoredNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

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

function getSubmissionAnswerDisplayValue(answer: FormSubmissionResponse["answers"][number]) {
  if (answer.answer_text != null && answer.answer_text !== "") return answer.answer_text;
  if (answer.answer_number != null) return String(answer.answer_number);
  if (answer.answer_boolean === true) return "yes";
  if (answer.answer_boolean === false) return "no";
  if (typeof answer.answer_json === "string") return answer.answer_json;
  return "";
}

function buildSubmissionResponses(submission: FormSubmissionResponse) {
  return Object.fromEntries(
    submission.answers.map((answer) => [
      String(answer.form_field_id),
      getSubmissionAnswerDisplayValue(answer),
    ])
  );
}

export function HistoryDetailDrawer({ selection, onClose, enrichedTasks = [] }: HistoryDetailDrawerProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState("");
  const [saved, setSaved] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["history-notes"],
    queryFn: fetchHistoryNotes,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: saveHistoryNotes,
    onSuccess: (nextNotes) => {
      setNotes(nextNotes);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      submissionId,
      review,
      note,
    }: {
      submissionId: number;
      review: "approved" | "rejected";
      note?: string;
    }) => formSubmissionService.review(submissionId, review, note),
    onSuccess: () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    },
  });

  useEffect(() => {
    if (notesQuery.data) {
      setNotes(notesQuery.data);
      return;
    }

    setNotes(readStoredNotes());
  }, [notesQuery.data]);

  useEffect(() => {
    if (!selection) {
      setDraftNote("");
      return;
    }
    const key = getNoteKey(selection);
    setDraftNote(notes[key] ?? "");
  }, [selection, notes]);

  function saveNote() {
    if (!selection) return;
    const key = getNoteKey(selection);
    const next = { ...notes, [key]: draftNote.trim() };
    setNotes(next);
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(next));
    saveMutation.mutate(next);
  }

  const fallbackTaskId =
    selection?.kind === "task" ? Number(selection.task.id) : undefined;
  const shouldLoadFallbackSession =
    selection?.kind === "task" &&
    !Object.values(selection.task.execution?.formResponses ?? {}).some((value) =>
      String(value ?? "").trim()
    );

  const fallbackSessionQuery = useQuery({
    queryKey: [...queryKeys.history.executionSessions(), "task", fallbackTaskId ?? "none"],
    queryFn: () =>
      getExecutionSessions({
        taskId: fallbackTaskId!,
        status: "completed",
      }),
    enabled:
      shouldLoadFallbackSession &&
      fallbackTaskId != null &&
      !Number.isNaN(fallbackTaskId),
    retry: false,
  });

  const resolvedSelection = useMemo((): HistoryDetailSelection | null => {
    if (!selection) return null;

    if (selection.kind !== "task") return selection;

    const hasResponses = Object.values(selection.task.execution?.formResponses ?? {}).some(
      (value) => String(value ?? "").trim()
    );

    if (hasResponses) return selection;

    const fallbackSession = (fallbackSessionQuery.data ?? []).sort(
      (first, second) => second.id - first.id
    )[0];

    if (!fallbackSession) return selection;

    return {
      kind: "session",
      session: fallbackSession,
      taskTitle: selection.task.title,
    };
  }, [selection, fallbackSessionQuery.data]);

  const templateId =
    resolvedSelection?.kind === "session"
      ? resolvedSelection.session.form_template_id
      : resolvedSelection?.kind === "form"
        ? resolvedSelection.submission.form_template_id
        : resolvedSelection?.kind === "task" && resolvedSelection.task.formTemplateId
          ? resolvedSelection.task.formTemplateId
          : null;

  const templateQuery = useQuery({
    queryKey: [...queryKeys.sop.formTemplates(), templateId],
    queryFn: () => formTemplateService.get(String(templateId)),
    enabled: Boolean(templateId),
  });

  const templatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: () => formTemplateService.list(),
    retry: false,
  });

  const exportTask = useMemo(() => {
    if (!resolvedSelection) return null;

    if (resolvedSelection.kind === "task") {
      const enriched =
        enrichedTasks.find((task) => task.id === resolvedSelection.task.id) ??
        resolvedSelection.task;
      return isTaskWorkedOn(enriched) ? enriched : null;
    }

    if (resolvedSelection.kind === "session") {
      const taskId = String(resolvedSelection.session.task_id);
      const enriched = enrichedTasks.find((task) => task.id === taskId);
      return enriched && isTaskWorkedOn(enriched) ? enriched : null;
    }

    return null;
  }, [resolvedSelection, enrichedTasks]);

  if (!resolvedSelection) return null;

  const template = templateQuery.data ?? null;
  const answersJson: Record<string, unknown> =
    resolvedSelection.kind === "session"
      ? resolvedSelection.session.answers_json
      : resolvedSelection.kind === "task" && resolvedSelection.task.execution
        ? { responses: resolvedSelection.task.execution.formResponses }
        : {};

  const responses =
    resolvedSelection.kind === "form"
      ? buildSubmissionResponses(resolvedSelection.submission)
      : parseResponses(answersJson as Record<string, unknown>);

  const checklist =
    resolvedSelection.kind === "session"
      ? parseChecklist(resolvedSelection.session.answers_json)
      : resolvedSelection.kind === "task"
        ? (resolvedSelection.task.execution?.checklist ?? null)
        : null;

  const evidenceItems = collectSubmissionEvidenceItems({
    evidencePayload: (answersJson as Record<string, unknown>).evidence,
    formResponses: responses,
    submissionAnswers:
      resolvedSelection.kind === "form" ? resolvedSelection.submission.answers : undefined,
    taskEvidence:
      resolvedSelection.kind === "task" ? resolvedSelection.task.execution?.evidence : undefined,
  });

  const suppressedMediaFieldIds = hiddenMediaFieldIds(responses, evidenceItems);

  const title =
    resolvedSelection.kind === "task"
      ? resolvedSelection.task.title
      : resolvedSelection.kind === "session"
        ? resolvedSelection.taskTitle
        : resolvedSelection.templateName;

  const formReviewStatus =
    resolvedSelection.kind === "form" ? resolvedSelection.submission.status : null;

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
          <div className="flex shrink-0 items-center gap-2">
            {exportTask ? (
              <TaskPdfExportButton
                task={exportTask}
                templates={templatesQuery.data ?? []}
                label="PDF"
              />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <X className="size-5" />
            </button>
          </div>
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

          {resolvedSelection.kind === "form" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Optional Review
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Status report:{" "}
                    <span className="font-bold capitalize text-slate-900">
                      {formReviewStatus}
                    </span>
                  </p>
                  {resolvedSelection.submission.reviewed_at ? (
                    <p className="mt-1 text-xs text-slate-400">
                      Reviewed at {new Date(resolvedSelection.submission.reviewed_at).toLocaleString("id-ID")}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      reviewMutation.mutate({
                        submissionId: resolvedSelection.submission.id,
                        review: "approved",
                        note: draftNote.trim() || undefined,
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reviewMutation.mutate({
                        submissionId: resolvedSelection.submission.id,
                        review: "rejected",
                        note: draftNote.trim() || undefined,
                      })
                    }
                    disabled={reviewMutation.isPending}
                    className="rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
              {reviewMutation.isError ? (
                <p className="mt-3 text-xs font-semibold text-red-700">
                  {reviewMutation.error instanceof Error
                    ? reviewMutation.error.message
                    : "Review failed."}
                </p>
              ) : reviewMutation.isSuccess ? (
                <p className="mt-3 text-xs font-semibold text-emerald-700">
                  Review tersimpan.
                </p>
              ) : null}
            </section>
          ) : null}

          {template ? (
            <SectionedFormRenderer
              fields={template.fields}
              responses={responses}
              onChange={() => undefined}
              readOnly
              hiddenFieldIds={suppressedMediaFieldIds}
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

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Review Note</p>
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={3}
              placeholder="Add a review note (synced to your account)..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={saveNote}
              disabled={saveMutation.isPending}
              className="mt-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving..." : saved ? "Saved" : "Save note"}
            </button>
          </section>
        </div>
      </aside>
    </div>
  );
}
