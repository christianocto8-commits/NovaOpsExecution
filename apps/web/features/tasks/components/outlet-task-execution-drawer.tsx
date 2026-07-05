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
    message: "Form belum tersimpan. Tetap keluar dari drawer?",
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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="flex h-full w-full max-w-2xl animate-in slide-in-from-right duration-300 flex-col border-l border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-6 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Outlet Execution
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{task.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {template
                  ? `${template.name} • ${template.fields.length} fields`
                  : "No form template assigned"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />

              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {template ? (
            <div className="mt-5">
              <FormProgressBar
                percentage={progress.percentage}
                completed={progress.completed}
                total={progress.total}
              />
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Operator audit required</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Isi semua field required sebelum submit final. Save Draft tetap bisa digunakan untuk
              melanjutkan nanti.
            </p>
          </section>

          {missingRequiredFields.length > 0 ? (
            <section className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                Complete all required fields before submitting this task.
              </p>
              <p className="mt-1 text-xs text-amber-700">
                The first missing field will be highlighted automatically when you press Submit.
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {missingRequiredFields.map((field) => (
                  <li key={field.id}>{field.label}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">Operator Name</label>
              <input
                value={form.operatorName}
                onChange={(event) => updateForm({ ...form, operatorName: event.target.value })}
                placeholder="Contoh: Fajar"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-600"
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
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600"
              >
                {operatorPositions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {template ? (
            <section>
              <div className="mb-3">
                <p className="text-sm font-bold text-slate-950">{template.name}</p>
                <p className="text-sm text-slate-500">{template.description}</p>
              </div>

              <SectionedFormRenderer
                fields={template.fields}
                responses={form.formResponses}
                onChange={(formResponses) => updateForm({ ...form, formResponses })}
                highlightedFieldIds={highlightedFieldIds}
              />
            </section>
          ) : null}

          <section>
            <label className="text-sm font-semibold text-slate-700">Execution Note</label>
            <textarea
              value={form.note}
              onChange={(event) => updateForm({ ...form, note: event.target.value })}
              placeholder="Catatan pengerjaan task"
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-600"
            />
          </section>

          <EvidenceGallery value={evidenceItems} onChange={handleEvidenceChange} />
        </div>

        <div className="sticky bottom-0 grid gap-3 border-t border-slate-200 bg-white/95 p-6 backdrop-blur sm:grid-cols-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
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
  );
}
