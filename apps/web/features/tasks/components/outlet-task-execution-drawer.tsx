"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { SectionedFormRenderer, getMissingRequiredFields } from "@/features/forms/renderer";
import { getTemplateSettings } from "@/features/forms/utils/template-settings";
import {
  getResponsiblePersonField,
  getResponsiblePersonValue,
} from "@/features/forms/utils/system-fields";
import { useUnsavedChangesGuard } from "@/features/tasks/hooks/use-unsaved-changes-guard";
import { Task, TaskExecutionForm } from "@/features/tasks/types";
import { DraftSaveState } from "@/features/tasks/types/autosave";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { queryKeys } from "@/lib/query/keys";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { formTemplateService } from "@/services/form-template.service";
import { FormProgressBar, useFormProgress } from "@/shared/form-progress";
import { SaveIndicator } from "@/shared/status";
import { useLanguage } from "@/shared/i18n";
import { useToast } from "@/shared/toast";

type OutletTaskExecutionDrawerProps = {
  open: boolean;
  task: Task | null;
  form: TaskExecutionForm;
  onClose: () => void;
  onChange: (form: TaskExecutionForm) => void;
  onCancel: () => void;
  onSaveDraft: () => Promise<void> | void;
  onSubmit: () => Promise<void> | void;
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
    Object.values(form.formResponses).some((value) => String(value ?? "").trim())
  );
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
  const { t } = useLanguage();
  const toast = useToast();
  const { isOnline } = useOnlineStatus();
  const { pendingTaskIds } = useOfflineSync();
  const isPendingSync = task ? pendingTaskIds.has(task.id) : false;
  const [highlightedFieldIds, setHighlightedFieldIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<DraftSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const templateQuery = useQuery({
    queryKey: [...queryKeys.sop.formTemplates(), task?.formTemplateId],
    queryFn: () => formTemplateService.get(task!.formTemplateId!),
    enabled: Boolean(task?.formTemplateId),
  });
  const template = templateQuery.data ?? null;
  const templateSettings = template ? getTemplateSettings(template.fields) : { require_execution_note: true };
  const responsiblePersonField = template ? getResponsiblePersonField(template.fields) : undefined;

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

  const guardEnabled = open && hasFormData(form) && saveState !== "saved";

  const { confirmLeave } = useUnsavedChangesGuard({
    enabled: guardEnabled,
    message: t("execution.unsavedGuard"),
  });

  function updateForm(nextForm: TaskExecutionForm) {
    onChange(nextForm);
    setSaveState("dirty");

    if (highlightedFieldIds.length > 0) {
      setHighlightedFieldIds([]);
    }
  }

  async function handleClose() {
    if (!confirmLeave()) return;
    onClose();
  }

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (!confirmLeave()) return;
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, confirmLeave, onClose]);

  async function handleCancel() {
    if (!confirmLeave()) return;
    onCancel();
  }

  async function handleSaveDraft() {
    try {
      setSaveState("saving");
      await onSaveDraft();
      setLastSavedAt(new Date());
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error(t("execution.toast.draftFailed"));
    }
  }

  async function handleSubmit() {
    const responsibleName = template
      ? getResponsiblePersonValue(template.fields, form.formResponses) || form.operatorName
      : form.operatorName;

    if (!responsibleName.trim()) {
      toast.warning(t("execution.toast.operatorRequired"));
      return;
    }

    if (templateSettings.require_execution_note && !form.note.trim()) {
      toast.warning(t("execution.toast.noteRequired"));
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

      toast.warning(
        t("execution.toast.fieldsRequired").replace("{count}", String(missingRequiredFields.length))
      );
      return;
    }

    try {
      setSaveState("saving");
      await onSubmit();
      setLastSavedAt(new Date());
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error(t("execution.toast.submitFailed"));
    }
  }

  if (!open || !task) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#F7FAF8]">
      <div className="flex h-[100dvh] w-full flex-col bg-[#F7FAF8]">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                  {t("execution.eyebrow")}
                </p>
                <h2 className="mt-1 line-clamp-2 text-lg font-bold text-slate-950 sm:text-xl lg:text-2xl">
                  {task.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {template
                    ? `${template.name} - ${progress.completed}/${progress.total} required`
                    : t("execution.noTemplate")}
                  {!isOnline ? t("execution.offlineSuffix") : null}
                  {isPendingSync ? t("execution.pendingSyncSuffix") : null}
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
        </div>

        <div className="flex-1 overflow-y-auto pb-36">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.5fr)_360px] lg:px-8">
            <div className="min-w-0 space-y-4 sm:space-y-6">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:rounded-3xl">
                <p className="text-sm font-semibold text-emerald-900">{t("execution.guideTitle")}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">{t("execution.guideBody")}</p>
              </section>

              {templateQuery.isLoading ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  {t("execution.loadingTemplate")}
                </section>
              ) : templateQuery.isError ? (
                <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                  {t("execution.templateLoadFailed")}
                </section>
              ) : template ? (
                <section>
                  <div className="mb-3 px-1">
                    <p className="text-base font-bold text-slate-950">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{template.description}</p>
                  </div>

                  <SectionedFormRenderer
                    fields={template.fields}
                    responses={form.formResponses}
                    onChange={(formResponses) => {
                      const nextResponsibleName = responsiblePersonField
                        ? formResponses[responsiblePersonField.id]?.trim() ?? ""
                        : form.operatorName;

                      updateForm({
                        ...form,
                        formResponses,
                        operatorName: responsiblePersonField ? nextResponsibleName : form.operatorName,
                      });
                    }}
                    highlightedFieldIds={highlightedFieldIds}
                  />
                </section>
              ) : task.formTemplateId ? (
                <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  {t("execution.noTemplate")}
                </section>
              ) : (
                <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  {t("execution.noTemplateAssigned")}
                </section>
              )}
            </div>

            <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
              {missingRequiredFields.length > 0 ? (
                <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 sm:rounded-3xl">
                  <p className="text-sm font-bold text-amber-900">{t("execution.missingRequired")}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                    {missingRequiredFields.map((field) => (
                      <li key={field.id}>{field.label}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <p className="text-sm font-bold text-slate-950">{t("execution.operator")}</p>
                <div className="mt-4 grid gap-4">
                  {!responsiblePersonField ? (
                    <div>
                      <label className="text-sm font-semibold text-slate-700">{t("execution.operatorName")}</label>
                      <input
                        value={form.operatorName}
                        onChange={(event) => updateForm({ ...form, operatorName: event.target.value })}
                        placeholder={t("execution.operatorPlaceholder")}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base outline-none transition focus:border-emerald-600"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      {t("execution.responsibleHint", {
                        section: t("execution.responsibleSection"),
                      })}
                      {form.operatorName.trim() ? (
                        <p className="mt-2 font-semibold">{form.operatorName}</p>
                      ) : null}
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-slate-700">{t("execution.position")}</label>
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

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                <label className="text-sm font-bold text-slate-950">
                  {t("execution.note")}
                  {!templateSettings.require_execution_note ? (
                    <span className="ml-1 font-normal text-slate-500">{t("execution.noteOptional")}</span>
                  ) : null}
                </label>
                <textarea
                  value={form.note}
                  onChange={(event) => updateForm({ ...form, note: event.target.value })}
                  placeholder={t("execution.notePlaceholder")}
                  rows={5}
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3.5 text-base outline-none transition focus:border-emerald-600"
                />
              </section>
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 lg:px-8">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
            <button
              type="button"
              onClick={handleCancel}
              className="col-span-2 min-h-[48px] rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:col-span-1"
            >
              {t("execution.cancel")}
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={
                !(responsiblePersonField
                  ? getResponsiblePersonValue(template?.fields ?? [], form.formResponses) ||
                    form.operatorName
                  : form.operatorName
                ).trim() || saveState === "saving"
              }
              className="min-h-[48px] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {saveState === "saving" ? t("execution.saving") : t("execution.saveDraft")}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveState === "saving"}
              className="min-h-[48px] rounded-2xl bg-emerald-700 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saveState === "saving"
                ? t("execution.saving")
                : !isOnline
                  ? t("execution.submitOffline")
                  : t("execution.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
