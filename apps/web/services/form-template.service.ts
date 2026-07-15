import { api } from "@/services/api";
import type { FormTemplate } from "@/features/forms/types";

export type BackendFormTemplate = {
  id: number;
  title: string;
  description: string | null;
  form_type: string;
  outlet_id: number | null;
  created_by: number;
  is_active: boolean;
};

export type BackendFormTemplateCreate = {
  title: string;
  description: string | null;
  form_type: string;
  outlet_id: number | null;
  created_by: number;
};

export function mapBackendFormTemplate(template: BackendFormTemplate): FormTemplate {
  return {
    id: String(template.id),
    name: template.title,
    category: template.form_type || "Checklist",
    description: template.description ?? "",
    status: template.is_active ? "Active" : "Archived",
    fields: [],
  };
}

export const formTemplateService = {
  async list() {
    const templates = await api<BackendFormTemplate[]>("/api/v1/form-templates");
    return templates.map(mapBackendFormTemplate);
  },

  async create(template: FormTemplate) {
    const payload: BackendFormTemplateCreate = {
      title: template.name,
      description: template.description || null,
      form_type: template.category || "Checklist",
      outlet_id: null,
      created_by: 1,
    };

    const created = await api<BackendFormTemplate>("/api/v1/form-templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return mapBackendFormTemplate(created);
  },
};