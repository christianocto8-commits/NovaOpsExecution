"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";

import { useSettings } from "@/features/settings/hooks/use-settings";
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
import { listMyTraining } from "@/services/lms.service";
import { formTemplateService } from "@/services/form-template.service";
import { hasResolvableBackendFormTemplate, isLocalFormTemplateSource } from "@/services/task.service";
import { outletService } from "@/services/outlet.service";
import { FormProgressBar, useFormProgress } from "@/shared/form-progress";
import { GeofenceStatusBanner, getCurrentPosition, getDistanceToOutletMeters } from "@/shared/evidence";
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
  onSubmit: (
    knownLocation?: { latitude: number; longitude: number; accuracy_m?: number } | null,
    templateFields?: import("@/features/forms/types").FormField[]
  ) => Promise<void> | void;
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
  const { settings } = useSettings();
  const isPendingSync = task ? pendingTaskIds.has(task.id) : false;
  const [highlightedFieldIds, setHighlightedFieldIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<DraftSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy_m?: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const geofenceEnabled = Boolean(settings?.geofence_enabled);
  const geofenceRadius = settings?.geofence_radius_meters ?? 200;
  const trainingGateEnabled = settings?.lms_training_gate_enabled !== false;

  const outletQuery = useQuery({
    queryKey: ["outlet", "current"],
    queryFn: () => outletService.getCurrent(),
    enabled: open && geofenceEnabled,
    retry: false,
  });

  const trainingQuery = useQuery({
    queryKey: ["my-training", "execution-gate"],
    queryFn: listMyTraining,
    enabled: open,
    retry: false,
  });

  const incompleteTrainingCount =
    trainingQuery.data?.filter((item) => item.required && !item.completed).length ?? 0;
  const trainingBlocked = trainingGateEnabled && incompleteTrainingCount > 0;

  useEffect(() => {
    if (!open || !geofenceEnabled) {
      setCurrentPosition(null);
      setLocationError(null);
      setIsLoadingLocation(false);
      return;
    }

    let cancelled = false;

    async function refreshLocation() {
      setIsLoadingLocation(true);
      try {
        const position = await getCurrentPosition(2000, { highAccuracy: false });
        if (!cancelled) {
          setCurrentPosition(position);
          setLocationError(null);
        }
      } catch {
        if (!cancelled) {
          setLocationError("GPS tidak tersedia. Izinkan lokasi di browser untuk submit.");
          setCurrentPosition(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLocation(false);
        }
      }
    }

    void refreshLocation();
    const intervalId = window.setInterval(() => {
      void refreshLocation();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [open, geofenceEnabled]);

  const geofenceDistanceMeters = useMemo(
    () =>
      getDistanceToOutletMeters({
        submitter: currentPosition,
        outletLat: outletQuery.data?.outlet.latitude,
        outletLon: outletQuery.data?.outlet.longitude,
      }),
    [currentPosition, outletQuery.data?.outlet.latitude, outletQuery.data?.outlet.longitude]
  );

  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.visualViewport) return;

    function syncKeyboardInset() {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(inset);
    }

    syncKeyboardInset();
    window.visualViewport.addEventListener("resize", syncKeyboardInset);
    window.visualViewport.addEventListener("scroll", syncKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", syncKeyboardInset);
      setKeyboardInset(0);
    };
  }, [open]);

  const templateQuery = useQuery({
    queryKey: [...queryKeys.sop.formTemplates(), task?.formTemplateId],
    queryFn: () => formTemplateService.get(task!.formTemplateId!),
    enabled: Boolean(task && hasResolvableBackendFormTemplate(task)),
  });
  const template = templateQuery.data ?? null;
  const templateSettings = template ? getTemplateSettings(template.fields) : { require_execution_note: true };
  const responsiblePersonField = template ? getResponsiblePersonField(template.fields) : undefined;
  const isLocalOnlyTemplate = isLocalFormTemplateSource(task?.sourceType);
  const hasChecklistPreview = (task?.checklistPreview?.length ?? 0) > 0;
  const checklistPreviewText = (task?.checklistPreview ?? []).slice(0, 5).join(", ");

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
  const confirmLeaveRef = useRef(confirmLeave);

  useEffect(() => {
    confirmLeaveRef.current = confirmLeave;
  }, [confirmLeave]);

  useEffect(() => {
    if (!open) return;

    setSaveState("idle");
    setHighlightedFieldIds([]);
    setLastSavedAt(null);
  }, [open, task?.id]);

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
      if (!confirmLeaveRef.current()) return;
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

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
    if (trainingBlocked) {
      toast.warning(t("training.executionBlocked"));
      return;
    }

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
      await onSubmit(
        geofenceEnabled ? currentPosition : undefined,
        template?.fields
      );
      setLastSavedAt(new Date());
      setSaveState("saved");
    } catch {
      setSaveState("error");
      toast.error(t("execution.toast.submitFailed"));
    }
  }

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const showAlertStrip = geofenceEnabled || incompleteTrainingCount > 0;

  if (!open || !task || !isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex min-h-[100dvh] flex-col bg-[#F7FAF8] supports-[min-height:100dvh]:min-h-[100dvh]">
      <header className="shrink-0 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="flex items-center gap-2 sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0 flex-1">
                <p className="hidden text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 sm:block">
                  {t("execution.eyebrow")}
                </p>
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold leading-tight text-slate-950 sm:mt-1 sm:line-clamp-2 sm:text-xl lg:text-2xl">
                    {task.title}
                  </h2>
                  <div className="hidden sm:block">
                    <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
                  </div>
                </div>
                <p className="mt-0.5 hidden truncate text-sm text-slate-500 sm:block">
                  {template
                    ? `${template.name} · ${progress.completed}/${progress.total} required`
                    : task.formTemplateName
                      ? task.formTemplateName
                      : t("execution.noTemplate")}
                  {!isOnline ? t("execution.offlineSuffix") : null}
                  {isPendingSync ? t("execution.pendingSyncSuffix") : null}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <div className="sm:hidden">
                  <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} compact />
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label={t("execution.cancel")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:h-10 sm:w-10 sm:rounded-2xl"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {template ? (
              <FormProgressBar
                variant="compact"
                className="mt-2 sm:hidden"
                percentage={progress.percentage}
                completed={progress.completed}
                total={progress.total}
              />
            ) : null}

            {showAlertStrip ? (
              <div className="mt-2 space-y-2 sm:mt-4 sm:space-y-3">
                <GeofenceStatusBanner
                  enabled={geofenceEnabled}
                  hasOutletCoords={
                    outletQuery.data?.outlet.latitude != null &&
                    outletQuery.data?.outlet.longitude != null
                  }
                  outletLat={outletQuery.data?.outlet.latitude}
                  outletLon={outletQuery.data?.outlet.longitude}
                  isLoadingLocation={isLoadingLocation || outletQuery.isLoading}
                  locationError={locationError}
                  distanceMeters={geofenceDistanceMeters}
                  radiusMeters={geofenceRadius}
                />
                {incompleteTrainingCount > 0 ? (
                  <div
                    className={`rounded-xl border px-3 py-2 text-xs sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
                      trainingBlocked
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {trainingBlocked
                      ? t("training.executionBlocked")
                      : t("training.executionWarning")}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 hidden sm:block">
              <FormProgressBar
                percentage={progress.percentage}
                completed={progress.completed}
                total={progress.total}
              />
            </div>
          </div>
        </div>
      </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: `calc(4.25rem + ${keyboardInset}px + env(safe-area-inset-bottom))` }}
        >
          <div className="mx-auto grid w-full max-w-6xl gap-3 px-3 py-3 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1.5fr)_360px] lg:px-8">
            <div className="min-w-0 space-y-3 sm:space-y-6">
              <section className="hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:block sm:rounded-3xl">
                <p className="text-sm font-semibold text-emerald-900">{t("execution.guideTitle")}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">{t("execution.guideBody")}</p>
              </section>

              {templateQuery.isLoading ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  {t("execution.loadingTemplate")}
                </section>
              ) : templateQuery.isError ? (
                <section className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                  {hasChecklistPreview
                    ? t("execution.checklistPreviewFallback", {
                        count: String(task.checklistFieldCount ?? task.checklistPreview?.length ?? 0),
                        preview: checklistPreviewText,
                      })
                    : t("execution.templateLoadFailed")}
                </section>
              ) : template ? (
                <section>
                  <div className="mb-3 hidden px-1 sm:block">
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
              ) : isLocalOnlyTemplate ? (
                <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  {t("execution.localTemplateOnly")}
                </section>
              ) : task.formTemplateId ? (
                <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                  {hasChecklistPreview
                    ? t("execution.checklistPreviewFallback", {
                        count: String(task.checklistFieldCount ?? task.checklistPreview?.length ?? 0),
                        preview: checklistPreviewText,
                      })
                    : t("execution.noTemplate")}
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

        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 lg:px-8"
          style={{ transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined }}
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-[44px] rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:col-span-1 sm:min-h-[48px] sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-sm"
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
              className="min-h-[44px] rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:min-h-[48px] sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-sm"
            >
              {saveState === "saving" ? t("execution.saving") : t("execution.saveDraft")}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveState === "saving" || trainingBlocked}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-2 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-h-[48px] sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-base"
            >
              {saveState === "saving"
                ? t("execution.saving")
                : !isOnline
                  ? t("execution.submitOffline")
                  : t("execution.submit")}
            </button>
          </div>
        </div>
      </div>,
    document.body
  );
}
