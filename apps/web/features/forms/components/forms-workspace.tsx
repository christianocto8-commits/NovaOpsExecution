"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, GripVertical, Plus, Save, Search, Settings2, Trash2 } from "lucide-react";

import { useActiveFormTemplates, useFormTemplates } from "@/features/forms/hooks/use-form-templates";
import { SectionedFormRenderer, getMissingRequiredFields } from "@/features/forms/renderer";
import { isResponsiblePersonField } from "@/features/forms/utils/system-fields";
import { FormField, FormFieldType, FormTemplate } from "@/features/forms/types";
import { DEFAULT_IDR_DENOMINATIONS } from "@/features/forms/utils/money";
import { TaskFormResponses } from "@/features/tasks/types";
import { useAuth } from "@/hooks/useAuth";
import { createLocalId } from "@/lib/local-id";
import { queryKeys } from "@/lib/query/keys";
import { formSubmissionService } from "@/services/form-submission.service";
import {
  createBlankFormTemplate,
  createMoneySafeCountTemplate,
  formTemplateService,
  isPersistedTemplateId,
} from "@/services/form-template.service";
import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";
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
  { value: "signature", label: "Tanda tangan" },
  { value: "responsible_person", label: "Nama pelaksana" },
  { value: "money_denomination", label: "Hitung denom uang" },
  { value: "money_amount", label: "Nominal uang" },
];

const formTypeOptions = [
  "Daily",
  "Checklist",
  "Audit",
  "Cleaning",
  "Cleaning Audit",
  "Opening",
  "Closing",
  "Inventory",
  "Quality Check",
  "Maintenance",
  "Custom",
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
  signature: "Tanda tangan",
  money_denomination: "Hitung denom uang",
  money_amount: "Nominal uang",
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
    header: "Type",
    render: (form) => (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
        {form.category}
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
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const { user } = useAuth();
  const { activeTemplates, isLoading, isError } = useActiveFormTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [responses, setResponses] = useState<TaskFormResponses>({});
  const [notice, setNotice] = useState<string | null>(null);
  const submitMutation = useMutation({
    mutationFn: formSubmissionService.submitManualForm,
  });

  useEffect(() => {
    if (!selectedTemplateId && activeTemplates[0]?.id) {
      setSelectedTemplateId(activeTemplates[0].id);
    }
  }, [activeTemplates, selectedTemplateId]);

  const selectedTemplate =
    activeTemplates.find((template) => template.id === selectedTemplateId) ??
    activeTemplates[0];

  async function submitManualForm() {
    if (!selectedTemplate || !user) return;

    const outletId = Number(workspace.outletId ?? user.outlet_access.outlet_id);
    const submittedBy = Number(user.user.id);

    if (!Number.isFinite(outletId)) {
      setNotice("Outlet context belum tersedia. Login ulang sebagai operator outlet.");
      return;
    }

    const missingRequiredFields = getMissingRequiredFields(selectedTemplate.fields, responses);

    if (missingRequiredFields.length > 0) {
      setNotice(`Lengkapi ${missingRequiredFields.length} field wajib, termasuk nama pelaksana.`);
      return;
    }

    try {
      await submitMutation.mutateAsync({
        templateId: selectedTemplate.id,
        outletId,
        submittedBy,
        fields: selectedTemplate.fields,
        responses,
      });

      setResponses({});
      setNotice(`${selectedTemplate.name} submitted for ${workspace.outletName ?? "Outlet"}.`);
    } catch {
      setNotice("Submit form gagal. Periksa koneksi API dan coba lagi.");
    }
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Manual Form</p>
          <h1 className="text-2xl font-semibold text-slate-950">My Form</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Submit manual outlet forms anytime for incidents, maintenance notes, or other events
            that are not available as scheduled tasks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void submitManualForm()}
          disabled={!selectedTemplate || submitMutation.isPending}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Form"}
        </button>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading active form templates...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Failed to load form templates from backend.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">Form Template</label>
        <select
          value={selectedTemplateId}
          onChange={(event) => {
            setSelectedTemplateId(event.target.value);
            setResponses({});
            setNotice(null);
          }}
          className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-600 lg:max-w-xl"
        >
          {activeTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        {selectedTemplate ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {selectedTemplate.description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No active form templates available.</p>
        )}
      </section>

      {selectedTemplate ? (
        <SectionedFormRenderer
          fields={selectedTemplate.fields}
          responses={responses}
          onChange={setResponses}
        />
      ) : null}
    </main>
  );
}

export function FormsWorkspace() {
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
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);

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

        return [savedTemplate, ...withoutSubmitted.filter((template) => template.id !== savedTemplate.id)];
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
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) return true;

      return [template.name, template.category, template.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, templates]);

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

  function createTemplate() {
    const newTemplate = createBlankFormTemplate();

    setTemplates((currentTemplates) => [newTemplate, ...currentTemplates]);
    setSelectedTemplateId(newTemplate.id);
  }

  function createMoneySafeCountForm() {
    const newTemplate = createMoneySafeCountTemplate();

    setTemplates((currentTemplates) => [newTemplate, ...currentTemplates]);
    setSelectedTemplateId(newTemplate.id);
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

        if (updates.type === "money_denomination" && !nextField.options?.denominations) {
          nextField.options = {
            currency: "IDR",
            denominations: DEFAULT_IDR_DENOMINATIONS,
          };
          nextField.section = nextField.section ?? "Penghitungan Setoran";
        }

        if (updates.type === "money_amount" && !nextField.options) {
          nextField.options = { currency: "IDR" };
          nextField.section = nextField.section ?? "Laporan Penjualan";
        }

        if (updates.type === "select" && !nextField.options?.choices?.length) {
          nextField.options = {
            ...nextField.options,
            choices: ["Option 1", "Option 2"],
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
    selectedTemplate?.fields.filter((field) => ["photo", "signature"].includes(field.type)).length ??
    0;

  if (templatesQuery.isLoading) {
    return (
      <main className="space-y-6 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading form templates...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Form Library</p>
          <h1 className="text-2xl font-semibold text-slate-950">My Form</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isAreaWorkspace
              ? "Area manager dapat melihat template form aktif sebagai referensi operasional, tanpa mengubah library template."
              : "Create reusable form templates for Task. Scheduling and auto-publish live inside Task."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex rounded-full px-3 py-1 font-bold ${
                templatesQuery.isSuccess
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {templatesQuery.isSuccess ? "Backend templates connected" : "Connecting to backend"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" />
              {lastSavedAt
                ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Ready to save"}
            </span>
          </div>
          {saveError ? <p className="mt-2 text-sm text-red-600">{saveError}</p> : null}
        </div>

        {isAreaWorkspace ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Read only for Area Manager
          </div>
        ) : !canManageTemplates ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Akun ini hanya bisa melihat template. Login sebagai Admin/Owner untuk membuat atau
            menyimpan template form.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={createMoneySafeCountForm}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-100"
            >
              <Plus className="size-4" />
              Money Safe Count
            </button>

            <button
              type="button"
              onClick={createTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              <Plus className="size-4" />
              New Form
            </button>

            <button
              type="button"
              onClick={() => void persistSelectedTemplate("Draft")}
              disabled={!hasSelectedTemplate || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <Save className="size-4" />
              {saveMutation.isPending ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => void persistSelectedTemplate("Active")}
              disabled={!hasSelectedTemplate || saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Save className="size-4" />
              {saveMutation.isPending ? "Saving..." : "Save Template"}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
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
                Belum ada template. Klik <span className="font-semibold">New Form</span> untuk
                mulai.
              </p>
            ) : null}

            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  selectedTemplate?.id === template.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:bg-slate-50",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-slate-900">{template.name}</p>
                <p className="mt-1 text-xs text-slate-500">{template.fields.length} items</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white">
          {!hasSelectedTemplate ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-lg font-semibold text-slate-900">Belum ada form template</p>
              <p className="max-w-md text-sm text-slate-500">
                Buat template baru untuk task outlet, atau gunakan preset Money Safe Count untuk
                penghitungan setoran dan laporan cash vs EDC.
              </p>
              {!isAreaWorkspace ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={createTemplate}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
                  >
                    <Plus className="size-4" />
                    New Form
                  </button>
                  <button
                    type="button"
                    onClick={createMoneySafeCountForm}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-100"
                  >
                    <Plus className="size-4" />
                    Money Safe Count
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
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
          </div>

          <div className="space-y-3 p-4">
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

                    {field.type === "select" ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Pilihan dropdown
                        </p>
                        {(field.options?.choices ?? []).map((choice, choiceIndex) => (
                          <div key={`${field.id}-choice-${choiceIndex}`} className="flex gap-2">
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
                                      choices: nextChoices.length ? nextChoices : ["Option 1"],
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

                    {field.type !== "yes_no" ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        <select
                          value={field.options?.showWhenFieldId ?? ""}
                          disabled={isAreaWorkspace}
                          onChange={(event) =>
                            updateField(field.id, {
                              options: {
                                ...field.options,
                                showWhenFieldId: event.target.value || undefined,
                              },
                            })
                          }
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                        >
                          <option value="">Always visible</option>
                          {selectedTemplate.fields
                            .filter(
                              (candidate) =>
                                candidate.type === "yes_no" && candidate.id !== field.id
                            )
                            .map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                Show when: {candidate.label}
                              </option>
                            ))}
                        </select>

                        {field.options?.showWhenFieldId ? (
                          <select
                            value={field.options?.showWhenValue ?? "Yes"}
                            disabled={isAreaWorkspace}
                            onChange={(event) =>
                              updateField(field.id, {
                                options: {
                                  ...field.options,
                                  showWhenValue: event.target.value,
                                },
                              })
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"
                          >
                            <option value="Yes">Answer is Yes</option>
                            <option value="No">Answer is No</option>
                          </select>
                        ) : null}
                      </div>
                    ) : null}
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

                  {field.type === "money_denomination" ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Auto subtotal
                    </span>
                  ) : null}

                  {field.type === "money_amount" ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      IDR format
                    </span>
                  ) : null}
                </div>
              </div>
            );
            })}
          </div>
            </>
          )}
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4">
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

          <div className="mt-5 grid grid-cols-3 gap-2">
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
            <div>
              <label className="text-xs font-semibold text-slate-700">Form Type</label>
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
                {formTypeOptions.map((taskType) => (
                  <option key={taskType} value={taskType}>
                    {taskType}
                  </option>
                ))}
              </select>
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
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
            </>
          )}
        </aside>
      </div>

      <EnterpriseDataTable
        title="My Form Library"
        description="Reusable form templates that can be selected inside Task."
        columns={columns}
        data={templates}
        getRowId={(form) => form.id}
        onRowClick={(form) => {
          setSelectedTemplateId(form.id);
        }}
      />
    </main>
  );
}
