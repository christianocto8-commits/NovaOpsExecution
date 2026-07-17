import { api } from "@/services/api";
import { cacheFormTemplates, getCachedFormTemplate, getCachedFormTemplates } from "@/lib/offline/store";
import type { FormField, FormFieldOptions, FormTemplate } from "@/features/forms/types";
import { DEFAULT_IDR_DENOMINATIONS } from "@/features/forms/utils/money";
import {
  ensureResponsiblePersonField,
} from "@/features/forms/utils/system-fields";

export function isPersistedTemplateId(templateId: string) {
  return /^\d+$/.test(templateId);
}

export function createMoneySafeCountTemplate(): FormTemplate {
  return {
    id: `local-${crypto.randomUUID()}`,
    name: "Money Safe Count",
    category: "Closing",
    description:
      "Penghitungan setoran uang tunai per denominasi dan laporan penjualan cash vs EDC.",
    status: "Draft",
    fields: ensureResponsiblePersonField([
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Uang Tunai Setoran",
        type: "money_denomination",
        required: true,
        section: "Penghitungan Setoran",
        options: {
          currency: "IDR",
          denominations: DEFAULT_IDR_DENOMINATIONS,
        },
      },
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Total Penjualan Cash",
        type: "money_amount",
        required: true,
        section: "Laporan Penjualan",
        options: { currency: "IDR" },
      },
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Total Penjualan EDC",
        type: "money_amount",
        required: true,
        section: "Laporan Penjualan",
        options: { currency: "IDR" },
      },
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Catatan / Selisih",
        type: "textarea",
        required: false,
        section: "Catatan",
      },
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Tanda tangan PIC",
        type: "signature",
        required: true,
        section: "Evidence & Sign Off",
      },
    ]),
  };
}

export function createBlankFormTemplate(): FormTemplate {
  return {
    id: `local-${crypto.randomUUID()}`,
    name: "New Form Template",
    category: "Daily",
    description: "Reusable form template for task execution.",
    status: "Draft",
    fields: ensureResponsiblePersonField([
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Form field",
        type: "yes_no",
        required: true,
      },
      {
        id: `local-field-${crypto.randomUUID()}`,
        label: "Photo evidence",
        type: "photo",
        required: false,
      },
    ]),
  };
}

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

function parseFieldOptions(optionsJson: unknown): FormFieldOptions | undefined {
  if (!optionsJson || typeof optionsJson !== "object") return undefined;

  const options = optionsJson as FormFieldOptions;

  return {
    currency: typeof options.currency === "string" ? options.currency : undefined,
    denominations: Array.isArray(options.denominations)
      ? options.denominations.filter((value): value is number => typeof value === "number")
      : undefined,
    system: options.system === true,
  };
}

function mapBackendField(field: BackendFormField): FormField {
  const options = parseFieldOptions(field.options_json);

  return {
    id: String(field.id),
    label: field.label,
    type: field.field_type as FormField["type"],
    required: field.is_required,
    section: field.help_text ?? undefined,
    options,
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
    fields: ensureResponsiblePersonField(
      (template.fields ?? [])
        .sort((left, right) => left.sort_order - right.sort_order)
        .map(mapBackendField)
    ),
  };
}

function toBackendFields(fields: FormField[]) {
  return fields.map((field, index) => ({
    label: field.label,
    field_type: field.type,
    placeholder: null,
    help_text: field.section ?? null,
    is_required: field.required,
    options_json: field.options ?? null,
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
    fields: toBackendFields(ensureResponsiblePersonField(template.fields)),
  };
}

export const formTemplateService = {
  async list() {
    try {
      const templates = await api<BackendFormTemplate[]>("/api/v1/form-templates");
      const mapped = templates.map(mapBackendFormTemplate);
      await cacheFormTemplates(mapped);
      return mapped;
    } catch (error) {
      const cached = await getCachedFormTemplates();

      if (cached.length > 0) {
        return cached;
      }

      throw error;
    }
  },

  async get(templateId: string) {
    try {
      const template = await api<BackendFormTemplate>(`/api/v1/form-templates/${templateId}`);
      const mapped = mapBackendFormTemplate(template);
      await cacheFormTemplates([mapped]);
      return mapped;
    } catch (error) {
      const cached = await getCachedFormTemplate(templateId);

      if (cached) {
        return cached;
      }

      throw error;
    }
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
