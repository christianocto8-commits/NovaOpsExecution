import { api } from "@/services/api";
import type { FormField, FormTemplate } from "@/features/forms/types";

export type BackendFormField = {
  id: number;
  form_template_id: number;
  label: string;
  field_type: string;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  options_json: unknown;
  validation_json: unknown;
  sort_order: number;
};

export type BackendFormTemplate = {
  id: number;
  title: string;
  description: string | null;
  form_type: string;
  outlet_id: number | null;
  created_by: number;
  is_active: boolean;
  fields: BackendFormField[];
};

export type BackendFormTemplateCreate = {
  title: string;
  description: string | null;
  form_type: string;
  outlet_id: number | null;
  created_by?: number;
  is_active: boolean;
  fields: Array<{
    label: string;
    field_type: string;
    placeholder?: string | null;
    help_text?: string | null;
    is_required: boolean;
    options_json?: unknown;
    validation_json?: unknown;
    sort_order: number;
  }>;
};

function mapBackendField(field: BackendFormField): FormField {
  return {
    id: String(field.id),
    label: field.label,
    type: field.field_type as FormField["type"],
    required: field.is_required,
  };
}

export function mapBackendFormTemplate(template: BackendFormTemplate): FormTemplate {
  const status: FormTemplate["status"] =
    template.form_type === "draft"
      ? "Draft"
      : template.is_active
        ? "Active"
        : "Archived";

  return {
    id: String(template.id),
    name: template.title,
    category: template.form_type === "draft" ? "Custom" : template.form_type || "Checklist",
    description: template.description ?? "",
    status,
    fields: (template.fields ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map(mapBackendField),
  };
}

function toBackendFields(fields: FormField[]) {
  return fields.map((field, index) => ({
    label: field.label,
    field_type: field.type,
    placeholder: null,
    help_text: null,
    is_required: field.required,
    options_json: null,
    validation_json: null,
    sort_order: index,
  }));
}

function toBackendPayload(template: FormTemplate): BackendFormTemplateCreate {
  const isDraft = template.status === "Draft";

  return {
    title: template.name,
    description: template.description || null,
    form_type: isDraft ? "draft" : template.category || "Checklist",
    outlet_id: null,
    is_active: template.status === "Active",
    fields: toBackendFields(template.fields),
  };
}

export const formTemplateService = {
  async list() {
    const templates = await api<BackendFormTemplate[]>("/api/v1/form-templates");
    return templates.map(mapBackendFormTemplate);
  },

  async get(templateId: string) {
    const template = await api<BackendFormTemplate>(`/api/v1/form-templates/${templateId}`);
    return mapBackendFormTemplate(template);
  },

  async create(template: FormTemplate) {
    const created = await api<BackendFormTemplate>("/api/v1/form-templates", {
      method: "POST",
      body: JSON.stringify(toBackendPayload(template)),
    });

    return mapBackendFormTemplate(created);
  },

  async update(templateId: string, template: FormTemplate) {
    const updated = await api<BackendFormTemplate>(`/api/v1/form-templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(toBackendPayload(template)),
    });

    return mapBackendFormTemplate(updated);
  },

  async remove(templateId: string) {
    return api<void>(`/api/v1/form-templates/${templateId}`, {
      method: "DELETE",
    });
  },
};
