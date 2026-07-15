"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Save, Search, Settings2, Trash2 } from "lucide-react";

import { formTemplates } from "@/features/forms/data/mock-form-templates";
import { FormField, FormFieldType, FormTemplate } from "@/features/forms/types";
import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";
import { queryKeys } from "@/lib/query/keys";
import { formTemplateService } from "@/services/form-template.service";

const DRAFT_STORAGE_KEY = "novaops_template_builder_draft";

const fieldTypeOptions: Array<{
  value: FormFieldType;
  label: string;
}> = [
  { value: "yes_no", label: "Yes / No" },
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "photo", label: "Photo" },
  { value: "signature", label: "Signature" },
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
  text: "Text",
  textarea: "Long text",
  yes_no: "Yes / No",
  number: "Number",
  photo: "Photo",
  signature: "Signature",
};

function createField(): FormField {
  return {
    id: `field-${crypto.randomUUID()}`,
    label: "Form field",
    type: "yes_no",
    required: true,
  };
}

function loadDraftTemplates() {
  const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);

  if (!rawDraft) return formTemplates;

  try {
    const parsedDraft = JSON.parse(rawDraft) as FormTemplate[];

    if (!Array.isArray(parsedDraft) || parsedDraft.length === 0) return formTemplates;

    return parsedDraft;
  } catch {
    return formTemplates;
  }
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

export function FormsWorkspace() {
  const queryClient = useQueryClient();
  const backendTemplatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
    retry: false,
  });
  const syncTemplateMutation = useMutation({
    mutationFn: formTemplateService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sop.formTemplates() }),
  });
  const [initialDraft] = useState(() => {
    const draftTemplates = loadDraftTemplates();

    return {
      templates: draftTemplates,
      selectedTemplateId: draftTemplates[0]?.id ?? "",
    };
  });
  const [templates, setTemplates] = useState<FormTemplate[]>(initialDraft.templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialDraft.selectedTemplateId);
  const [query, setQuery] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(templates));
      setLastSavedAt(new Date().toISOString());
    }, 500);

    return () => window.clearTimeout(timer);
  }, [templates]);

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

  const requiredItems = selectedTemplate.fields.filter((field) => field.required).length;
  const evidenceItems = selectedTemplate.fields.filter((field) =>
    ["photo", "signature"].includes(field.type)
  ).length;
  function updateSelectedTemplate(updates: Partial<FormTemplate>) {
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
    updateSelectedTemplate({
      fields: selectedTemplate.fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...updates,
            }
          : field
      ),
    });
  }

  function addField() {
    updateSelectedTemplate({
      fields: [...selectedTemplate.fields, createField()],
    });
  }

  function deleteField(fieldId: string) {
    updateSelectedTemplate({
      fields: selectedTemplate.fields.filter((field) => field.id !== fieldId),
    });
  }

  function createTemplate() {
    const newTemplate: FormTemplate = {
      id: `FORM-${Date.now()}`,
      name: "New Form Template",
      category: "Daily",
      description: "Reusable form template for SOP task execution.",
      status: "Draft",
      fields: [
        {
          id: `field-${crypto.randomUUID()}`,
          label: "Form field",
          type: "yes_no",
          required: true,
        },
        {
          id: `field-${crypto.randomUUID()}`,
          label: "Photo evidence",
          type: "photo",
          required: false,
        },
      ],
    };

    setTemplates((currentTemplates) => [newTemplate, ...currentTemplates]);
    setSelectedTemplateId(newTemplate.id);
  }

  function deleteSelectedTemplate() {
    const confirmed = window.confirm(`Delete "${selectedTemplate.name}" template?`);

    if (!confirmed) return;

    const nextTemplates = templates.filter((template) => template.id !== selectedTemplate.id);

    setTemplates(nextTemplates);
    setSelectedTemplateId(nextTemplates[0]?.id ?? "");
  }

  function saveDraftNow() {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(templates));
    setLastSavedAt(new Date().toISOString());
  }

  async function syncSelectedTemplate() {
    await syncTemplateMutation.mutateAsync(selectedTemplate);
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Form Library</p>
          <h1 className="text-2xl font-semibold text-slate-950">My Form</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Create reusable form templates for SOP Tasks. Scheduling and auto-publish live inside
            SOP Task.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`inline-flex rounded-full px-3 py-1 font-bold ${
                backendTemplatesQuery.isSuccess
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {backendTemplatesQuery.isSuccess ? "Backend templates connected" : "Local form draft"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" />
              {lastSavedAt
                ? `Draft saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Autosave ready"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
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
            onClick={() => void syncSelectedTemplate()}
            disabled={syncTemplateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Save className="size-4" />
            {syncTemplateMutation.isPending ? "Syncing..." : "Sync to Backend"}
          </button>

          <button
            type="button"
            onClick={saveDraftNow}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            <Save className="size-4" />
            Save Draft
          </button>
        </div>
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
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  selectedTemplate.id === template.id
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
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Template Workspace
              </p>
              <input
                value={selectedTemplate.name}
                onChange={(event) =>
                  updateSelectedTemplate({
                    name: event.target.value,
                  })
                }
                className="mt-1 w-full border-0 bg-transparent p-0 text-lg font-semibold text-slate-950 outline-none"
              />
              <textarea
                value={selectedTemplate.description}
                onChange={(event) =>
                  updateSelectedTemplate({
                    description: event.target.value,
                  })
                }
                rows={2}
                className="mt-1 w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-500 outline-none"
              />
            </div>

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
              onClick={deleteSelectedTemplate}
              disabled={templates.length <= 1}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </div>

          <div className="space-y-3 p-4">
            {selectedTemplate.fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Item {index + 1}
                    </p>
                    <input
                      value={field.label}
                      onChange={(event) =>
                        updateField(field.id, {
                          label: event.target.value,
                        })
                      }
                      className="mt-1 w-full border-0 bg-transparent p-0 font-semibold text-slate-950 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteField(field.id)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                    aria-label="Delete item"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <select
                    value={field.type}
                    onChange={(event) =>
                      updateField(field.id, {
                        type: event.target.value as FormFieldType,
                      })
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {fieldTypeLabel[field.type]}
                  </span>

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
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200 bg-white p-4">
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
        </aside>
      </div>

      <EnterpriseDataTable
        title="My Form Library"
        description="Reusable form templates that can be selected inside SOP Task."
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
