"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Eye,
  GripVertical,
  History,
  PanelRightOpen,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

import {
  FormLibraryPanel,
  rememberRecentTemplate,
} from "@/features/forms/components/form-library-panel";
import {
  useActiveFormTemplates,
  useFormTemplates,
} from "@/features/forms/hooks/use-form-templates";
import { SectionedFormRenderer, getMissingRequiredFields } from "@/features/forms/renderer";
import { isResponsiblePersonField } from "@/features/forms/utils/system-fields";
import {
  getTemplateSettings,
  setTemplateRequireExecutionNote,
  setTemplateRequiresApproval,
} from "@/features/forms/utils/template-settings";
import { visibilityOperatorLabels } from "@/features/forms/utils/field-visibility";
import {
  FormField,
  FormFieldType,
  FormTemplate,
  FieldVisibilityOperator,
} from "@/features/forms/types";
import {
  getFormCategoryLabel,
  ZENPUT_FORM_CATEGORIES,
} from "@/features/forms/constants/form-categories";
import { TaskFormResponses } from "@/features/tasks/types";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createLocalId } from "@/lib/local-id";
import { enqueueMutation } from "@/lib/offline/store";
import { queryKeys } from "@/lib/query/keys";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { useLanguage } from "@/shared/i18n";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import {
  buildFormSubmissionCreatePayload,
  formSubmissionService,
} from "@/services/form-submission.service";
import { getCurrentPosition, checkGeofencePrecheck } from "@/shared/evidence";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { outletService } from "@/services/outlet.service";
import { useToast } from "@/shared/toast";
import {
  createBlankFormTemplate,
  formTemplateService,
  isPersistedTemplateId,
  type FormTemplateVersion,
} from "@/services/form-template.service";
import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";
import { Modal } from "@/shared/ui/overlay/modal";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

const fieldTypeOptions: Array<{
  value: FormFieldType;
  label: string;
}> = [
  { value: "yes_no", label: "Ya / Tidak" },
  { value: "text", label: "Text singkat" },
  { value: "textarea", label: "Kotak teks" },
  { value: "number", label: "Angka" },
  { value: "select", label: "Dropdown / Pilihan" },
  { value: "date", label: "Tanggal" },
  { value: "time", label: "Waktu" },
  { value: "photo", label: "Foto bukti" },
  { value: "video", label: "Video bukti" },
  { value: "signature", label: "Tanda tangan" },
  { value: "rating", label: "Penilaian bintang" },
  { value: "barcode", label: "Scan barcode / QR" },
  { value: "responsible_person", label: "Nama pelaksana" },
];

const visibilityOperatorOptions: Array<{ value: FieldVisibilityOperator; label: string }> = [
  { value: "equals", label: visibilityOperatorLabels.equals },
  { value: "not_equals", label: visibilityOperatorLabels.not_equals },
  { value: "contains", label: visibilityOperatorLabels.contains },
  { value: "is_empty", label: visibilityOperatorLabels.is_empty },
  { value: "is_not_empty", label: visibilityOperatorLabels.is_not_empty },
];

const fieldTypeLabel: Record<FormFieldType, string> = {
  text: "Text singkat",
  textarea: "Kotak teks",
  yes_no: "Ya / Tidak",
  number: "Angka",
  select: "Dropdown / Pilihan",
  date: "Tanggal",
  time: "Waktu",
  photo: "Foto bukti",
  video: "Video bukti",
  signature: "Tanda tangan",
  rating: "Penilaian bintang",
  barcode: "Scan barcode / QR",
  money_denomination: "Angka",
  money_amount: "Angka",
  responsible_person: "Nama pelaksana",
};

function createField(): FormField {
  return {
    id: `local-field-${createLocalId()}`,
    label: "Form field",
    type: "yes_no",
    required: true,
  };
}

const columns: EnterpriseColumn<FormTemplate>[] = [
  {
    key: "name",
    header: "Template",
    render: (form) => (
      <div>
        <p className="font-semibold text-slate-950">{form.name}</p>
        <p className="text-xs text-slate-500">{form.description}</p>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    render: (form) => (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        {getFormCategoryLabel(form.category)}
      </span>
    ),
  },
  {
    key: "fields",
    header: "Items",
    render: (form) => `${form.fields.length} items`,
  },
  {
    key: "status",
    header: "Status",
    render: (form) => (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        {form.status}
      </span>
    ),
  },
];

function OutletManualFormsWorkspace() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const { settings } = useSettings();
  const { refreshPendingCount, pendingSyncCount } = useOfflineSync();
  const toast = useToast();
  const { activeTemplates, isLoading, isError } = useActiveFormTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [responses, setResponses] = useState<TaskFormResponses>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitMutation = useMutation({
    mutationFn: formSubmissionService.submitManualForm,
  });

  useEffect(() => {
    const requestedTemplateId = searchParams.get("templateId");
    if (requestedTemplateId) {
      setSelectedTemplateId(requestedTemplateId);
      return;
    }

    if (!selectedTemplateId && activeTemplates[0]?.id) {
      setSelectedTemplateId(activeTemplates[0].id);
    }
  }, [activeTemplates, searchParams, selectedTemplateId]);

  const selectedTemplate =
    activeTemplates.find((template) => template.id === selectedTemplateId) ?? activeTemplates[0];

  async function submitManualForm() {
    if (!selectedTemplate || !user) return;

    const outletId = workspace.legacyOutletId ?? user.outlet_access.legacy_outlet_id ?? null;
    if (outletId == null || !Number.isFinite(outletId)) {
      setNotice("Outlet context belum tersedia. Login ulang sebagai operator outlet.");
      return;
    }

    const missingRequiredFields = getMissingRequiredFields(selectedTemplate.fields, responses);

    if (missingRequiredFields.length > 0) {
      setNotice(`Lengkapi ${missingRequiredFields.length} field wajib, termasuk nama pelaksana.`);
      return;
    }

    rememberRecentTemplate(selectedTemplate.id);

    const submitLocation = await getCurrentPosition();

    if (settings?.geofence_enabled) {
      try {
        const currentOutlet = await outletService.getCurrent();
        const geofenceError = checkGeofencePrecheck({
          submitter: submitLocation,
          outletLat: currentOutlet.outlet.latitude,
          outletLon: currentOutlet.outlet.longitude,
          radiusMeters: settings.geofence_radius_meters ?? 200,
        });

        if (geofenceError) {
          toast.error(geofenceError);
          return;
        }
      } catch {
        toast.error("Gagal memverifikasi lokasi outlet untuk geofence.");
        return;
      }
    }

    const payload = buildFormSubmissionCreatePayload({
      templateId: selectedTemplate.id,
      outletId,
      fields: selectedTemplate.fields,
      responses,
    });

    setIsSubmitting(true);

    try {
      if (isOnline) {
        await submitMutation.mutateAsync({
          templateId: selectedTemplate.id,
          outletId,
          fields: selectedTemplate.fields,
          responses,
        });

        setResponses({});
        setNotice(`${selectedTemplate.name} submitted for ${workspace.outletName ?? "Outlet"}.`);
        return;
      }

      await enqueueMutation({
        id: createLocalId(),
        type: "FORM_SUBMIT",
        taskId: `form:${selectedTemplate.id}`,
        label: selectedTemplate.name,
        payload: {
          ...payload,
          latitude: submitLocation?.latitude ?? null,
          longitude: submitLocation?.longitude ?? null,
          accuracy_m: submitLocation?.accuracy_m ?? null,
        },
        createdAt: new Date().toISOString(),
        status: "pending",
      });

      await refreshPendingCount();
      setResponses({});
      setNotice(
        `${selectedTemplate.name} disimpan lokal (${pendingSyncCount + 1} menunggu sinkron).`
      );
      toast.success("Form disimpan offline dan akan disinkronkan saat online.");
    } catch {
      setNotice("Submit form gagal. Periksa koneksi API dan coba lagi.");
      toast.error("Gagal menyimpan form.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={`${mobileDashboardMainClass} pb-24 sm:pb-6`}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("forms.manual.eyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("forms.manual.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("forms.manual.subtitle")}</p>
          {!isOnline ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">
              {t("forms.manual.offlineHint")}
            </p>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("forms.manual.loading")}
        </div>
      ) : null}

      {isError && activeTemplates.length === 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {t("forms.manual.loadError")}{" "}
          {isOnline ? t("forms.manual.checkApi") : t("forms.manual.offlineCacheEmpty")}
        </div>
      ) : null}

      <FormLibraryPanel
        compact
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={(template) => {
          setSelectedTemplateId(template.id);
          setResponses({});
          setNotice(null);
          rememberRecentTemplate(template.id);
        }}
      />

      {selectedTemplate ? (
        <p className="max-w-2xl text-sm leading-6 text-slate-500">{selectedTemplate.description}</p>
      ) : (
        <p className="text-sm text-slate-500">No active form templates available.</p>
      )}

      {selectedTemplate ? (
        <SectionedFormRenderer
          fields={selectedTemplate.fields}
          responses={responses}
          onChange={setResponses}
        />
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="button"
          onClick={() => void submitManualForm()}
          disabled={!selectedTemplate || isSubmitting || submitMutation.isPending}
          className="w-full rounded-2xl bg-emerald-700 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:max-w-xs"
        >
          {isSubmitting || submitMutation.isPending ? "Submitting..." : "Submit Form"}
        </button>
      </div>
    </main>
  );
}

export function FormsWorkspace() {
  const { t } = useLanguage();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const templatesQuery = useFormTemplates();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResponses, setPreviewResponses] = useState<TaskFormResponses>({});
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<FormTemplateVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<number | null>(null);
  const toast = useToast();

  const saveMutation = useMutation({
    mutationFn: async (template: FormTemplate) => {
      if (isPersistedTemplateId(template.id)) {
        return formTemplateService.update(template.id, template);
      }

      return formTemplateService.create(template);
    },
    onSuccess: (savedTemplate, submittedTemplate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.formTemplates() });
      setTemplates((currentTemplates) => {
        const withoutSubmitted = currentTemplates.filter(
          (template) => template.id !== submittedTemplate.id
        );

        return [
          savedTemplate,
          ...withoutSubmitted.filter((template) => template.id !== savedTemplate.id),
        ];
      });
      setSelectedTemplateId(savedTemplate.id);
      setLastSavedAt(new Date().toISOString());
      setSaveError(null);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan template ke backend.";
      setSaveError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: formTemplateService.remove,
    onSuccess: (_, deletedTemplateId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.formTemplates() });
      setTemplates((currentTemplates) => {
        const nextTemplates = currentTemplates.filter(
          (template) => template.id !== deletedTemplateId
        );
        setSelectedTemplateId(nextTemplates[0]?.id ?? "");
        return nextTemplates;
      });
      setSaveError(null);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus template dari backend.";
      setSaveError(message);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: formTemplateService.duplicate,
    onSuccess: (duplicatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.formTemplates() });
      setTemplates((currentTemplates) => [duplicatedTemplate, ...currentTemplates]);
      setSelectedTemplateId(duplicatedTemplate.id);
      setSaveError(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Gagal menduplikasi template.";
      setSaveError(message);
    },
  });

  async function openVersionHistory() {
    if (!selectedTemplate || !isPersistedTemplateId(selectedTemplate.id)) return;

    setVersionsOpen(true);
    setVersionsLoading(true);
    setVersionsError(null);

    try {
      const items = await formTemplateService.listVersions(selectedTemplate.id);
      setVersions(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("forms.admin.versionLoadError");
      setVersionsError(message);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function restoreTemplateVersion(versionId: number, versionNumber: number) {
    if (!selectedTemplate || !isPersistedTemplateId(selectedTemplate.id)) return;

    setRestoringVersionId(versionId);

    try {
      const restoredTemplate = await formTemplateService.restoreVersion(
        selectedTemplate.id,
        versionId
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.formTemplates() });
      setTemplates((currentTemplates) =>
        currentTemplates.map((template) =>
          template.id === restoredTemplate.id ? restoredTemplate : template
        )
      );
      setSelectedTemplateId(restoredTemplate.id);
      setLastSavedAt(new Date().toISOString());
      toast.success(t("forms.admin.versionRestored").replace("{version}", String(versionNumber)));
      setVersionsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("forms.admin.versionLoadError");
      toast.error(message);
    } finally {
      setRestoringVersionId(null);
    }
  }

  useEffect(() => {
    if (!templatesQuery.data) return;

    setTemplates((currentTemplates) => {
      const localOnlyTemplates = currentTemplates.filter(
        (template) => !isPersistedTemplateId(template.id)
      );

      return [...localOnlyTemplates, ...templatesQuery.data];
    });
  }, [templatesQuery.data]);

  useEffect(() => {
    if (selectedTemplateId) return;
    if (templates[0]?.id) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (categoryFilter !== "all" && template.category !== categoryFilter) {
        return false;
      }

      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) return true;

      return [template.name, getFormCategoryLabel(template.category), template.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categoryFilter, query, templates]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", templates.length);

    templates.forEach((template) => {
      counts.set(template.category, (counts.get(template.category) ?? 0) + 1);
    });

    return counts;
  }, [templates]);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    filteredTemplates[0] ??
    templates[0];

  if (workspace.mode === "outlet") {
    return <OutletManualFormsWorkspace />;
  }

  const isAreaWorkspace = workspace.mode === "area";
  const canManageTemplates = can("form.create") || can("form.edit");
  const hasSelectedTemplate = Boolean(selectedTemplate);

  function createTemplate(categoryId = "uncategorized") {
    const newTemplate = createBlankFormTemplate();
    newTemplate.category = categoryId;

    setTemplates((currentTemplates) => [newTemplate, ...currentTemplates]);
    setSelectedTemplateId(newTemplate.id);
    setEditorOpen(true);
  }

  function updateSelectedTemplate(updates: Partial<FormTemplate>) {
    if (!selectedTemplate) return;

    setTemplates((currentTemplates) =>
      currentTemplates.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              ...updates,
            }
          : template
      )
    );
  }

  function updateField(fieldId: string, updates: Partial<FormField>) {
    if (!selectedTemplate) return;

    updateSelectedTemplate({
      fields: selectedTemplate.fields.map((field) => {
        if (field.id !== fieldId) return field;

        const nextField = {
          ...field,
          ...updates,
        };

        if (isResponsiblePersonField(nextField)) {
          nextField.type = "responsible_person";
          nextField.required = true;
          nextField.section = nextField.section ?? "Pelaksana Tugas";
          nextField.options = { system: true };
        }

        if (updates.type === "select" && !nextField.options?.choices?.length) {
          nextField.options = {
            ...nextField.options,
            choices: ["Option 1", "Option 2"],
          };
        }

        if (updates.type === "rating" && nextField.options?.maxStars == null) {
          nextField.options = {
            ...nextField.options,
            maxStars: 5,
          };
          nextField.validation = {
            ...nextField.validation,
            min: nextField.validation?.min ?? 3,
          };
        }

        return nextField;
      }),
    });
  }

  function addField() {
    if (!selectedTemplate) return;

    updateSelectedTemplate({
      fields: [...selectedTemplate.fields, createField()],
    });
  }

  function deleteField(fieldId: string) {
    if (!selectedTemplate) return;

    const targetField = selectedTemplate.fields.find((field) => field.id === fieldId);
    if (targetField && isResponsiblePersonField(targetField)) return;

    updateSelectedTemplate({
      fields: selectedTemplate.fields.filter((field) => field.id !== fieldId),
    });
  }

  function reorderField(fromIndex: number, toIndex: number) {
    if (!selectedTemplate || fromIndex === toIndex) return;

    const nextFields = [...selectedTemplate.fields];
    const [movedField] = nextFields.splice(fromIndex, 1);
    nextFields.splice(toIndex, 0, movedField);

    updateSelectedTemplate({ fields: nextFields });
  }

  async function duplicateSelectedTemplate() {
    if (!selectedTemplate || !isPersistedTemplateId(selectedTemplate.id)) {
      setSaveError("Simpan template terlebih dahulu sebelum menduplikasi.");
      return;
    }

    await duplicateMutation.mutateAsync(selectedTemplate.id);
  }

  async function deleteSelectedTemplate() {
    if (!selectedTemplate) return;

    const confirmed = window.confirm(`Delete "${selectedTemplate.name}" template?`);

    if (!confirmed) return;

    if (isPersistedTemplateId(selectedTemplate.id)) {
      await deleteMutation.mutateAsync(selectedTemplate.id);
      return;
    }

    const nextTemplates = templates.filter((template) => template.id !== selectedTemplate.id);

    setTemplates(nextTemplates);
    setSelectedTemplateId(nextTemplates[0]?.id ?? "");
  }

  async function persistSelectedTemplate(status: FormTemplate["status"]) {
    if (!selectedTemplate) return;

    if (!canManageTemplates) {
      setSaveError(
        "Akun ini tidak punya izin form.create. Login sebagai Admin/Owner untuk membuat template."
      );
      return;
    }

    const templateToSave = {
      ...selectedTemplate,
      status,
    };

    setSaveError(null);
    updateSelectedTemplate({ status });

    try {
      await saveMutation.mutateAsync(templateToSave);
    } catch {
      // saveMutation.onError handles message display
    }
  }

  const requiredItems = selectedTemplate?.fields.filter((field) => field.required).length ?? 0;
  const evidenceItems =
    selectedTemplate?.fields.filter((field) => ["photo", "signature"].includes(field.type))
      .length ?? 0;
  const templateSettings = selectedTemplate
    ? getTemplateSettings(selectedTemplate.fields)
    : { require_execution_note: true, requires_approval: false };

  if (templatesQuery.isLoading) {
    return (
      <main className={mobileDashboardMainClass}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {t("forms.admin.loading")}
        </div>
      </main>
    );
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("forms.admin.eyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("forms.admin.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isAreaWorkspace ? t("forms.admin.subtitleArea") : t("forms.admin.subtitle")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex rounded-full px-3 py-1 font-bold ${
                templatesQuery.isSuccess
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {templatesQuery.isSuccess
                ? t("forms.admin.backendConnected")
                : t("forms.admin.backendConnecting")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" />
              {lastSavedAt
                ? t("forms.admin.savedAt").replace(
                    "{time}",
                    new Date(lastSavedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  )
                : t("forms.admin.readyToSave")}
            </span>
          </div>
          {saveError ? <p className="mt-2 text-sm text-red-600">{saveError}</p> : null}
        </div>

        {isAreaWorkspace ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("forms.admin.readOnlyArea")}
          </div>
        ) : !canManageTemplates ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("forms.admin.viewOnlyHint")}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                createTemplate(categoryFilter === "all" ? "uncategorized" : categoryFilter)
              }
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-100"
            >
              <Plus className="size-4" />
              {t("forms.admin.newForm")}
            </button>

            <button
              type="button"
              onClick={() => void openVersionHistory()}
              disabled={
                !hasSelectedTemplate ||
                !isPersistedTemplateId(selectedTemplate?.id ?? "") ||
                versionsLoading
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <History className="size-4" />
              {t("forms.admin.versionHistory")}
            </button>

            <button
              type="button"
              onClick={() => void duplicateSelectedTemplate()}
              disabled={
                !hasSelectedTemplate ||
                !isPersistedTemplateId(selectedTemplate?.id ?? "") ||
                duplicateMutation.isPending
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <Copy className="size-4" />
              {duplicateMutation.isPending
                ? t("forms.admin.duplicating")
                : t("forms.admin.duplicate")}
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewResponses({});
                setPreviewOpen(true);
              }}
              disabled={!hasSelectedTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <Eye className="size-4" />
              {t("forms.admin.preview")}
            </button>

            <button
              type="button"
              onClick={() => void persistSelectedTemplate("Draft")}
              disabled={!hasSelectedTemplate || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <Save className="size-4" />
              {saveMutation.isPending ? t("forms.admin.saving") : t("forms.admin.saveDraft")}
            </button>

            <button
              type="button"
              onClick={() => void persistSelectedTemplate("Active")}
              disabled={!hasSelectedTemplate || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save className="size-4" />
              {saveMutation.isPending ? t("forms.admin.saving") : t("forms.admin.saveTemplate")}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Categories</p>
          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={[
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                categoryFilter === "all"
                  ? "bg-emerald-50 font-semibold text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              <span>All forms</span>
              <span className="text-xs">{categoryCounts.get("all") ?? 0}</span>
            </button>
            {ZENPUT_FORM_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                  categoryFilter === category.id
                    ? "bg-emerald-50 font-semibold text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <span>{category.label}</span>
                <span className="text-xs">{categoryCounts.get(category.id) ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search className="size-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates"
              className="w-full border-0 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="mt-4 space-y-2">
            {filteredTemplates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
                Belum ada template di kategori ini. Klik{" "}
                <span className="font-semibold">{t("forms.admin.newForm")}</span> untuk mulai.
              </p>
            ) : null}

            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  setEditorOpen(true);
                }}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  selectedTemplate?.id === template.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">{template.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {getFormCategoryLabel(template.category)} · {template.fields.length} items
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          {!hasSelectedTemplate ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">Belum ada form template</p>
              <p className="max-w-md text-sm text-slate-500">
                Buat template baru dan assign ke kategori operasional seperti di Zenput (Opening,
                Food Safety, Audit, dll.).
              </p>
              {!isAreaWorkspace ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => createTemplate()}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-100"
                  >
                    <Plus className="size-4" />
                    {t("forms.admin.newForm")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  Selected template
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {selectedTemplate.name}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  {selectedTemplate.description || "Tidak ada deskripsi."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Items</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {selectedTemplate.fields.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Required</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{requiredItems}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Evidence</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{evidenceItems}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 sm:w-fit"
              >
                <PanelRightOpen className="size-4" />
                Open template editor
              </button>
            </div>
          )}
        </section>
      </div>

      {hasSelectedTemplate && editorOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
          <button
            type="button"
            aria-label="Close template editor"
            className="absolute inset-0 hidden cursor-default sm:block"
            onClick={() => setEditorOpen(false)}
          />

          <div className="relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-5xl sm:rounded-l-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Template Workspace
                </p>
                <input
                  value={selectedTemplate.name}
                  readOnly={isAreaWorkspace}
                  onChange={(event) =>
                    updateSelectedTemplate({
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full border-0 bg-transparent p-0 text-lg font-semibold text-slate-950 outline-none"
                />
                <textarea
                  value={selectedTemplate.description}
                  readOnly={isAreaWorkspace}
                  onChange={(event) =>
                    updateSelectedTemplate({
                      description: event.target.value,
                    })
                  }
                  rows={2}
                  className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-500 outline-none"
                />
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {!isAreaWorkspace ? (
                  <>
                    <button
                      type="button"
                      onClick={addField}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      <Plus className="size-4" />
                      Add Item
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteSelectedTemplate()}
                      disabled={templates.length <= 1 || deleteMutation.isPending}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </button>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Close template editor"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="order-2 p-4">
                <div className="space-y-3">
                  {selectedTemplate.fields.map((field, index) => {
                    const isSystemResponsibleField = isResponsiblePersonField(field);

                    return (
                      <div
                        key={field.id}
                        className={`rounded-xl border p-4 transition ${
                          draggingFieldId === field.id
                            ? "border-emerald-400 bg-emerald-50/40 opacity-70"
                            : "border-slate-200"
                        }`}
                        onDragOver={(event) => {
                          if (isAreaWorkspace) return;
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          if (isAreaWorkspace) return;
                          event.preventDefault();
                          const sourceId = event.dataTransfer.getData("text/plain");
                          const sourceIndex = selectedTemplate.fields.findIndex(
                            (candidate) => candidate.id === sourceId
                          );
                          if (sourceIndex >= 0) {
                            reorderField(sourceIndex, index);
                          }
                          setDraggingFieldId(null);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {!isAreaWorkspace ? (
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", field.id);
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingFieldId(field.id);
                              }}
                              onDragEnd={() => setDraggingFieldId(null)}
                              className="mt-1 flex size-9 shrink-0 cursor-grab items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 active:cursor-grabbing"
                              aria-label="Urutkan item"
                            >
                              <GripVertical className="size-4" />
                            </button>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Item {index + 1}
                            </p>
                            <input
                              value={field.label}
                              readOnly={isAreaWorkspace || isSystemResponsibleField}
                              onChange={(event) =>
                                updateField(field.id, {
                                  label: event.target.value,
                                })
                              }
                              className="mt-1 w-full border-0 bg-transparent p-0 font-semibold text-slate-950 outline-none"
                            />
                          </div>

                          {!isAreaWorkspace && !isSystemResponsibleField ? (
                            <button
                              type="button"
                              onClick={() => deleteField(field.id)}
                              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                              aria-label="Delete item"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                          <select
                            value={field.type}
                            disabled={isAreaWorkspace || isSystemResponsibleField}
                            onChange={(event) =>
                              updateField(field.id, {
                                type: event.target.value as FormFieldType,
                              })
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"
                          >
                            {fieldTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>

                          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={field.required}
                              disabled={isAreaWorkspace || isSystemResponsibleField}
                              onChange={(event) =>
                                updateField(field.id, {
                                  required: event.target.checked,
                                })
                              }
                              className="size-4 accent-emerald-700"
                            />
                            Required
                          </label>
                        </div>

                        {!isSystemResponsibleField ? (
                          <div className="mt-3 space-y-3">
                            <input
                              value={field.section ?? ""}
                              readOnly={isAreaWorkspace}
                              onChange={(event) =>
                                updateField(field.id, {
                                  section: event.target.value,
                                })
                              }
                              placeholder="Section name (e.g. Opening, Kitchen)"
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                            />

                            {field.type === "number" ? (
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="number"
                                  value={field.validation?.min ?? ""}
                                  readOnly={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      validation: {
                                        ...field.validation,
                                        min:
                                          event.target.value === ""
                                            ? undefined
                                            : Number(event.target.value),
                                      },
                                    })
                                  }
                                  placeholder="Min value"
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                />
                                <input
                                  type="number"
                                  value={field.validation?.max ?? ""}
                                  readOnly={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      validation: {
                                        ...field.validation,
                                        max:
                                          event.target.value === ""
                                            ? undefined
                                            : Number(event.target.value),
                                      },
                                    })
                                  }
                                  placeholder="Max value"
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                />
                              </div>
                            ) : null}

                            {field.type === "yes_no" ? (
                              <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={field.options?.allow_na ?? false}
                                  disabled={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      options: {
                                        ...field.options,
                                        allow_na: event.target.checked,
                                      },
                                    })
                                  }
                                  className="rounded border-slate-300"
                                />
                                Izinkan opsi N/A / Tidak Berlaku
                              </label>
                            ) : null}

                            {field.type === "rating" ? (
                              <div className="grid gap-2 md:grid-cols-3">
                                <label className="grid gap-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Maks bintang
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={field.options?.maxStars ?? 5}
                                    readOnly={isAreaWorkspace}
                                    onChange={(event) =>
                                      updateField(field.id, {
                                        options: {
                                          ...field.options,
                                          maxStars:
                                            event.target.value === ""
                                              ? 5
                                              : Number(event.target.value),
                                        },
                                      })
                                    }
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                  />
                                </label>
                                <input
                                  value={field.options?.lowLabel ?? ""}
                                  readOnly={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      options: {
                                        ...field.options,
                                        lowLabel: event.target.value || undefined,
                                      },
                                    })
                                  }
                                  placeholder="Label rendah (opsional)"
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                />
                                <input
                                  value={field.options?.highLabel ?? ""}
                                  readOnly={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      options: {
                                        ...field.options,
                                        highLabel: event.target.value || undefined,
                                      },
                                    })
                                  }
                                  placeholder="Label tinggi (opsional)"
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                />
                                <label className="grid gap-1 md:col-span-3">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Ambang lulus (min bintang)
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={field.options?.maxStars ?? 5}
                                    value={field.validation?.min ?? 3}
                                    readOnly={isAreaWorkspace}
                                    onChange={(event) =>
                                      updateField(field.id, {
                                        validation: {
                                          ...field.validation,
                                          min:
                                            event.target.value === ""
                                              ? undefined
                                              : Number(event.target.value),
                                        },
                                      })
                                    }
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                  />
                                </label>
                              </div>
                            ) : null}

                            {field.type === "barcode" ? (
                              <p className="text-xs text-slate-500">
                                Operator dapat scan kamera (jika browser mendukung) atau input
                                manual kode barcode / QR.
                              </p>
                            ) : null}

                            <div className="grid gap-2 md:grid-cols-2">
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Bobot skor
                                </span>
                                <input
                                  type="number"
                                  min={0.1}
                                  step={0.1}
                                  value={field.validation?.weight ?? ""}
                                  readOnly={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      validation: {
                                        ...field.validation,
                                        weight:
                                          event.target.value === ""
                                            ? undefined
                                            : Number(event.target.value),
                                      },
                                    })
                                  }
                                  placeholder="Default: 1"
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                />
                              </label>
                              <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={field.validation?.critical ?? false}
                                  disabled={isAreaWorkspace}
                                  onChange={(event) =>
                                    updateField(field.id, {
                                      validation: {
                                        ...field.validation,
                                        critical: event.target.checked || undefined,
                                      },
                                    })
                                  }
                                  className="rounded border-slate-300"
                                />
                                Item kritis (gagal = checklist fail)
                              </label>
                            </div>

                            {field.type === "select" ? (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Pilihan dropdown
                                </p>
                                {(field.options?.choices ?? []).map((choice, choiceIndex) => (
                                  <div
                                    key={`${field.id}-choice-${choiceIndex}`}
                                    className="flex gap-2"
                                  >
                                    <input
                                      value={choice}
                                      readOnly={isAreaWorkspace}
                                      onChange={(event) => {
                                        const nextChoices = [...(field.options?.choices ?? [])];
                                        nextChoices[choiceIndex] = event.target.value;
                                        updateField(field.id, {
                                          options: {
                                            ...field.options,
                                            choices: nextChoices,
                                          },
                                        });
                                      }}
                                      placeholder={`Pilihan ${choiceIndex + 1}`}
                                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                    />
                                    {!isAreaWorkspace ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nextChoices = (field.options?.choices ?? []).filter(
                                            (_, index) => index !== choiceIndex
                                          );
                                          updateField(field.id, {
                                            options: {
                                              ...field.options,
                                              choices: nextChoices.length
                                                ? nextChoices
                                                : ["Option 1"],
                                            },
                                          });
                                        }}
                                        className="rounded-xl border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        Hapus
                                      </button>
                                    ) : null}
                                  </div>
                                ))}
                                {!isAreaWorkspace ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateField(field.id, {
                                        options: {
                                          ...field.options,
                                          choices: [
                                            ...(field.options?.choices ?? []),
                                            `Option ${(field.options?.choices?.length ?? 0) + 1}`,
                                          ],
                                        },
                                      })
                                    }
                                    className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                                  >
                                    + Tambah pilihan
                                  </button>
                                ) : null}
                              </div>
                            ) : null}

                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Visibilitas kondisional
                              </p>
                              <div className="mt-2 grid gap-2 md:grid-cols-3">
                                <select
                                  value={
                                    field.options?.visibilityRule?.fieldId ??
                                    field.options?.showWhenFieldId ??
                                    ""
                                  }
                                  disabled={isAreaWorkspace}
                                  onChange={(event) => {
                                    const fieldId = event.target.value;
                                    if (!fieldId) {
                                      updateField(field.id, {
                                        options: {
                                          ...field.options,
                                          visibilityRule: undefined,
                                          showWhenFieldId: undefined,
                                          showWhenValue: undefined,
                                        },
                                      });
                                      return;
                                    }

                                    updateField(field.id, {
                                      options: {
                                        ...field.options,
                                        showWhenFieldId: undefined,
                                        showWhenValue: undefined,
                                        visibilityRule: {
                                          fieldId,
                                          operator:
                                            field.options?.visibilityRule?.operator ?? "equals",
                                          value: field.options?.visibilityRule?.value ?? "No",
                                        },
                                      },
                                    });
                                  }}
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                >
                                  <option value="">Selalu tampil</option>
                                  {selectedTemplate.fields
                                    .filter((candidate) => candidate.id !== field.id)
                                    .map((candidate) => (
                                      <option key={candidate.id} value={candidate.id}>
                                        {candidate.label}
                                      </option>
                                    ))}
                                </select>

                                {field.options?.visibilityRule?.fieldId ||
                                field.options?.showWhenFieldId ? (
                                  <>
                                    <select
                                      value={
                                        field.options?.visibilityRule?.operator ??
                                        (field.options?.showWhenFieldId ? "equals" : "equals")
                                      }
                                      disabled={isAreaWorkspace}
                                      onChange={(event) => {
                                        const operator = event.target
                                          .value as FieldVisibilityOperator;
                                        const currentFieldId =
                                          field.options?.visibilityRule?.fieldId ??
                                          field.options?.showWhenFieldId ??
                                          "";

                                        updateField(field.id, {
                                          options: {
                                            ...field.options,
                                            showWhenFieldId: undefined,
                                            showWhenValue: undefined,
                                            visibilityRule: {
                                              fieldId: currentFieldId,
                                              operator,
                                              value: field.options?.visibilityRule?.value ?? "No",
                                            },
                                          },
                                        });
                                      }}
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                    >
                                      {visibilityOperatorOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>

                                    {field.options?.visibilityRule?.operator !== "is_empty" &&
                                    field.options?.visibilityRule?.operator !== "is_not_empty" ? (
                                      <input
                                        value={field.options?.visibilityRule?.value ?? ""}
                                        disabled={isAreaWorkspace}
                                        onChange={(event) => {
                                          const currentFieldId =
                                            field.options?.visibilityRule?.fieldId ??
                                            field.options?.showWhenFieldId ??
                                            "";

                                          updateField(field.id, {
                                            options: {
                                              ...field.options,
                                              visibilityRule: {
                                                fieldId: currentFieldId,
                                                operator:
                                                  field.options?.visibilityRule?.operator ??
                                                  "equals",
                                                value: event.target.value,
                                              },
                                            },
                                          });
                                        }}
                                        placeholder="Nilai (mis. No, Fail)"
                                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                                      />
                                    ) : (
                                      <div className="flex h-10 items-center rounded-xl border border-dashed border-slate-200 px-3 text-xs text-slate-500">
                                        Operator tidak memerlukan nilai
                                      </div>
                                    )}
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {fieldTypeLabel[field.type]}
                          </span>

                          {isSystemResponsibleField ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Wajib sistem
                            </span>
                          ) : null}

                          {field.options?.visibilityRule?.fieldId ||
                          field.options?.showWhenFieldId ? (
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                              Conditional
                            </span>
                          ) : null}

                          {field.required ? (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Required
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Optional
                            </span>
                          )}

                          {["photo", "signature"].includes(field.type) ? (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Evidence
                            </span>
                          ) : null}

                          {field.type === "rating" ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              {field.options?.maxStars ?? 5} bintang
                            </span>
                          ) : null}

                          {field.type === "barcode" ? (
                            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                              Scan / manual
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="order-1 border-b border-slate-200 bg-slate-50/70 p-4">
                {!hasSelectedTemplate ? (
                  <p className="text-sm text-slate-500">
                    Pilih atau buat template untuk mengatur field dan publish status.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Settings2 className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Template Settings</p>
                        <p className="text-xs text-slate-500">Publish rules for outlets</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Items</p>
                        <p className="mt-1 text-xl font-bold text-slate-950">
                          {selectedTemplate.fields.length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Required</p>
                        <p className="mt-1 text-xl font-bold text-slate-950">{requiredItems}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Evidence</p>
                        <p className="mt-1 text-xl font-bold text-slate-950">{evidenceItems}</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                          Governance lifecycle
                        </p>
                        <p className="mt-1 text-sm font-semibold text-emerald-950">
                          {selectedTemplate.status === "Draft"
                            ? "Draft - belum tersedia untuk outlet"
                            : selectedTemplate.status === "Pending Review"
                              ? "Pending review - menunggu approval owner/admin"
                              : selectedTemplate.status === "Active"
                                ? "Published - tersedia untuk execution"
                                : "Archived - disimpan untuk history"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-800">
                          Simpan perubahan besar sebagai draft/copy dulu, lalu aktifkan setelah
                          review. Version history menyimpan snapshot sebelum perubahan penting.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700">Category</label>
                        <select
                          value={selectedTemplate.category}
                          disabled={isAreaWorkspace}
                          onChange={(event) =>
                            updateSelectedTemplate({
                              category: event.target.value,
                            })
                          }
                          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        >
                          {ZENPUT_FORM_CATEGORIES.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          {getFormCategoryLabel(selectedTemplate.category)} — folder kategori
                          operasional
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700">Status</label>
                        <select
                          value={selectedTemplate.status}
                          disabled={isAreaWorkspace}
                          onChange={(event) =>
                            updateSelectedTemplate({
                              status: event.target.value as FormTemplate["status"],
                            })
                          }
                          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending Review">Pending Review</option>
                          <option value="Active">Active</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>

                      <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={templateSettings.require_execution_note}
                          disabled={isAreaWorkspace}
                          onChange={(event) =>
                            updateSelectedTemplate({
                              fields: setTemplateRequireExecutionNote(
                                selectedTemplate.fields,
                                event.target.checked
                              ),
                            })
                          }
                          className="mt-0.5 rounded border-slate-300"
                        />
                        <span>
                          <span className="font-semibold text-slate-900">
                            Wajibkan catatan pelaksanaan
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Jika dimatikan, Execution Note opsional saat submit task.
                          </span>
                        </span>
                      </label>

                      <label className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={templateSettings.requires_approval}
                          disabled={isAreaWorkspace}
                          onChange={(event) =>
                            updateSelectedTemplate({
                              fields: setTemplateRequiresApproval(
                                selectedTemplate.fields,
                                event.target.checked
                              ),
                            })
                          }
                          className="mt-0.5 rounded border-slate-300"
                        />
                        <span>
                          <span className="font-semibold text-slate-900">
                            Wajib review owner/admin
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            Submit outlet masuk sebagai evidence submitted dan menunggu approval
                            sebelum completed.
                          </span>
                        </span>
                      </label>
                    </div>
                  </>
                )}
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      <EnterpriseDataTable
        title={t("forms.admin.tableTitle")}
        description={t("forms.admin.tableDescription")}
        columns={columns}
        data={templates}
        getRowId={(form) => form.id}
        onRowClick={(form) => {
          setSelectedTemplateId(form.id);
          setEditorOpen(true);
        }}
      />

      <Modal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        title={t("forms.admin.versionHistoryTitle")}
        description={t("forms.admin.versionHistoryDescription")}
        size="md"
      >
        {versionsLoading ? (
          <p className="text-sm text-slate-500">{t("forms.admin.loading")}</p>
        ) : versionsError ? (
          <p className="text-sm text-red-600">{versionsError}</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-slate-500">{t("forms.admin.versionEmpty")}</p>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">v{version.version_number}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={restoringVersionId === version.id}
                  onClick={() => void restoreTemplateVersion(version.id, version.version_number)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {restoringVersionId === version.id
                    ? t("forms.admin.versionRestoring")
                    : t("forms.admin.versionRestore")}
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {selectedTemplate ? (
        <Modal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={`Preview: ${selectedTemplate.name}`}
          description="Pratinjau read-only template form saat ini (perubahan belum disimpan tetap tampil)."
          size="xl"
        >
          <SectionedFormRenderer
            fields={selectedTemplate.fields}
            responses={previewResponses}
            onChange={setPreviewResponses}
            readOnly
          />
        </Modal>
      ) : null}
    </main>
  );
}
