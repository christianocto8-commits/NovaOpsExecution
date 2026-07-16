"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";

import { getFormTemplate } from "@/features/forms/data/mock-form-templates";
import { SectionedFormRenderer, getMissingRequiredFields } from "@/features/forms/renderer";
import { useAutoSave } from "@/features/tasks/hooks/use-auto-save";
import { useUnsavedChangesGuard } from "@/features/tasks/hooks/use-unsaved-changes-guard";
import { Task, TaskExecutionForm } from "@/features/tasks/types";
import { EvidenceGallery, EvidenceItem } from "@/shared/evidence";
import { FormProgressBar, useFormProgress } from "@/shared/form-progress";
import { SaveIndicator } from "@/shared/status";

type OutletTaskExecutionDrawerProps = {
  open: boolean;
  task: Task | null;
  form: TaskExecutionForm;
  onClose: () => void;
  onChange: (form: TaskExecutionForm) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
};

const operatorPositions: TaskExecutionForm["operatorPosition"][] = [
  "Crew",
  "Senior Barista",
  "Lead Barista",
  "Head Barista",
];

function hasFormData(form: TaskExecutionForm) {
  return (
    Boolean(form.operatorName.trim()) ||
    Boolean(form.note.trim()) ||
    Boolean(form.evidenceText.trim()) ||
    Object.values(form.formResponses).some((value) => String(value ?? "").trim())
  );
}

function parseEvidenceItems(value: string): EvidenceItem[] {
  if (!value.trim()) return [];

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

function serializeEvidenceItems(items: EvidenceItem[]) {
  return JSON.stringify(items);
}

export function OutletTaskExecutionDrawer({
  open,
  task,
  form,
  onClose,
  onChange,
  onCancel,
  onSaveDraft,
  onSubmit,
}: OutletTaskExecutionDrawerProps) {
  const [highlightedFieldIds, setHighlightedFieldIds] = useState<string[]>([]);

  const template = task ? getFormTemplate(task.formTemplateId) : null;

  const evidenceItems = useMemo(() => parseEvidenceItems(form.evidenceText), [form.evidenceText]);

  const missingRequiredFields = template
    ? getMissingRequiredFields(template.fields, form.formResponses)
    : [];

  const progressFields =
    template?.fields?.map((field) => ({
      id: field.id,
      label: field.label,
      required: field.required,
    })) ?? [];

  const progress = useFormProgress(progressFields, form.formResponses);

  const { saveState, lastSavedAt, markDirty, forceSave } = useAutoSave({
    enabled: open && Boolean(task),
    getPayload: () =>
      task
        ? {
            taskId: task.id,
            formTemplateId: task.formTemplateId,
            values: {
              operatorName: form.operatorName,
              operatorPosition: form.operatorPosition,
              note: form.note,
              evidenceText: form.evidenceText,
              formResponses: form.formResponses,
            },
            progress: progress.percentage,
          }
        : null,
  });

  const guardEnabled = open && hasFormData(form) && saveState !== "saved";

  const { confirmLeave } = useUnsavedChangesGuard({
    enabled: guardEnabled,
    message: "Form belum tersimpan. Tetap keluar dari task ini?",
  });

  function updateForm(nextForm: TaskExecutionForm) {
    onChange(nextForm);
    markDirty();

    if (highlightedFieldIds.length > 0) {
      setHighlightedFieldIds([]);
    }
  }

  async function handleClose() {
    if (saveState === "dirty") {
      await forceSave();
    }

    if (!confirmLeave()) return;
    onClose();
  }

  async function handleCancel() {
    if (!confirmLeave()) return;
    onCancel();
  }

  function handleEvidenceChange(items: EvidenceItem[]) {
    updateForm({
      ...form,
      evidenceText: serializeEvidenceItems(items),
    });
  }

  async function handleSaveDraft() {
    await forceSave();
    onSaveDraft();
  }

  async function handleSubmit() {
    if (!form.operatorName.trim()) {
      window.alert("Operator Name wajib diisi.");
      return;
    }

    if (!form.note.trim()) {
      window.alert("Execution Note wajib diisi.");
      return;
    }

    if (missingRequiredFields.length > 0) {
      const ids = missingRequiredFields.map((field) => field.id);

      setHighlightedFieldIds(ids);

      window.setTimeout(() => {
        const firstField = document.querySelector(`[data-form-field-id="${ids[0]}"]`);

        firstField?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      window.setTimeout(() => {
        setHighlightedFieldIds([]);
      }, 3500);

      return;
    }

    await forceSave();
    onSubmit();
  }

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white sm:flex sm:justify-end sm:bg-slate-950/40 sm:backdrop-blur-sm">
      <div
        className="flex h-[100dvh] w-full flex-col bg-[#F7FAF8] shadow-2xl sm:max-w-2xl sm:border-l sm:border-slate-200 sm:bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                Task Execution
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-bold text-slate-950 sm:text-xl">
                {task.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {template
                  ? `${template.name} • ${progress.completed}/${progress.total} required`
                  : "No form template assigned"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <FormProgressBar
              percentage={progress.percentage}
              completed={progress.completed}
              total={progress.total}
            />
            <div className="sm:hidden">
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-36 sm:space-y-6 sm:px-6 sm:py-6 sm:pb-32">
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:rounded-3xl">
            <p className="text-sm font-semibold text-emerald-900">Selesaikan task seperti checklist lapangan</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Isi item wajib, tambahkan catatan seperlunya, lalu unggah bukti. Draft bisa disimpan kapan saja.
            </p>
          </section>

          {missingRequiredFields.length > 0 ? (
            <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:rounded-3xl">
              <p className="text-sm font-bold text-amber-900">
                Masih ada field wajib yang belum diisi.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {missingRequiredFields.map((field) => (
                  <li key={field.id}>{field.label}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <p className="text-sm font-bold text-slate-950">Operator</p>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">Operator Name</label>
                <input
                  value={form.operatorName}
                  onChange={(event) => updateForm({ ...form, operatorName: event.target.value })}
                  placeholder="Contoh: Fajar"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base outline-none transition focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">Operator Position</label>
                <select
                  value={form.operatorPosition}
                  onChange={(event) =>
                    updateForm({
                      ...form,
                      operatorPosition: event.target.value as TaskExecutionForm["operatorPosition"],
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base outline-none transition focus:border-emerald-600"
                >
                  {operatorPositions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {template ? (
            <section>
              <div className="mb-3 px-1">
                <p className="text-base font-bold text-slate-950">{template.name}</p>
                <p className="mt-1 text-sm text-slate-500">{template.description}</p>
              </div>

              <SectionedFormRenderer
                fields={template.fields}
                responses={form.formResponses}
                onChange={(formResponses) => updateForm({ ...form, formResponses })}
                highlightedFieldIds={highlightedFieldIds}
              />
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
            <label className="text-sm font-bold text-slate-950">Execution Note</label>
            <textarea
              value={form.note}
              onChange={(event) => updateForm({ ...form, note: event.target.value })}
              placeholder="Tulis catatan singkat hasil pengerjaan task"
              rows={4}
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3.5 text-base outline-none transition focus:border-emerald-600"
            />
          </section>

          <EvidenceGallery value={evidenceItems} onChange={handleEvidenceChange} />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:absolute sm:px-6 sm:py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
            <button
              type="button"
              onClick={handleCancel}
              className="col-span-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:col-span-1"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={!form.operatorName.trim()}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              Save Draft
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveState === "saving"}
              className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saveState === "saving" ? "Saving..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
