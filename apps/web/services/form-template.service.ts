import { api } from "@/services/api";
import { createLocalId } from "@/lib/local-id";
import { cacheFormTemplates, getCachedFormTemplate, getCachedFormTemplates } from "@/lib/offline/store";
import type {
  FieldVisibilityOperator,
  FormField,
  FormFieldOptions,
  FormFieldValidation,
  FormTemplate,
} from "@/features/forms/types";
import { DEFAULT_IDR_DENOMINATIONS } from "@/features/forms/utils/money";
import {
  ensureResponsiblePersonField,
} from "@/features/forms/utils/system-fields";

export function isPersistedTemplateId(templateId: string) {
  return /^\d+$/.test(templateId);
}

export function createMoneySafeCountTemplate(): FormTemplate {
  return {
    id: `local-${createLocalId()}`,
    name: "Money Safe Count",
    category: "Closing",
    description:
      "Penghitungan setoran uang tunai per denominasi dan laporan penjualan cash vs EDC.",
    status: "Draft",
    fields: ensureResponsiblePersonField([
      {
        id: `local-field-${createLocalId()}`,
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
        id: `local-field-${createLocalId()}`,
        label: "Total Penjualan Cash",
        type: "money_amount",
        required: true,
        section: "Laporan Penjualan",
        options: { currency: "IDR" },
      },
      {
        id: `local-field-${createLocalId()}`,
        label: "Total Penjualan EDC",
        type: "money_amount",
        required: true,
        section: "Laporan Penjualan",
        options: { currency: "IDR" },
      },
      {
        id: `local-field-${createLocalId()}`,
        label: "Catatan / Selisih",
        type: "textarea",
        required: false,
        section: "Catatan",
      },
      {
        id: `local-field-${createLocalId()}`,
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
    id: `local-${createLocalId()}`,
    name: "New Form Template",
    category: "Daily",
    description: "Reusable form template for task execution.",
    status: "Draft",
    fields: ensureResponsiblePersonField([
      {
        id: `local-field-${createLocalId()}`,
        label: "Form field",
        type: "yes_no",
        required: true,
      },
      {
        id: `local-field-${createLocalId()}`,
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

const visibilityOperators = new Set<FieldVisibilityOperator>([
  "equals",
  "not_equals",
  "contains",
  "is_empty",
  "is_not_empty",
]);

function parseVisibilityRule(options: Record<string, unknown>) {
  const rawRule = options.visibilityRule;
  if (!rawRule || typeof rawRule !== "object") return undefined;

  const rule = rawRule as Record<string, unknown>;
  const fieldId = typeof rule.fieldId === "string" ? rule.fieldId : undefined;
  const operator =
    typeof rule.operator === "string" && visibilityOperators.has(rule.operator as FieldVisibilityOperator)
      ? (rule.operator as FieldVisibilityOperator)
      : undefined;

  if (!fieldId || !operator) return undefined;

  return {
    fieldId,
    operator,
    value: typeof rule.value === "string" ? rule.value : undefined,
  };
}

function parseFieldOptions(optionsJson: unknown): FormFieldOptions | undefined {
  if (!optionsJson || typeof optionsJson !== "object") return undefined;

  const options = optionsJson as FormFieldOptions & Record<string, unknown>;
  const visibilityRule = parseVisibilityRule(options);

  return {
    currency: typeof options.currency === "string" ? options.currency : undefined,
    denominations: Array.isArray(options.denominations)
      ? options.denominations.filter((value): value is number => typeof value === "number")
      : undefined,
    system: options.system === true,
    showWhenFieldId:
      typeof options.showWhenFieldId === "string" ? options.showWhenFieldId : undefined,
    showWhenValue:
      typeof options.showWhenValue === "string" ? options.showWhenValue : undefined,
    visibilityRule,
    choices: Array.isArray(options.choices)
      ? options.choices.filter((value): value is string => typeof value === "string")
      : undefined,
    allow_na: options.allow_na === true,
    maxStars:
      typeof options.maxStars === "number" && options.maxStars > 0
        ? Math.min(10, Math.round(options.maxStars))
        : undefined,
    lowLabel: typeof options.lowLabel === "string" ? options.lowLabel : undefined,
    highLabel: typeof options.highLabel === "string" ? options.highLabel : undefined,
  };
}

function parseFieldValidation(validationJson: unknown): FormFieldValidation | undefined {
  if (!validationJson || typeof validationJson !== "object") return undefined;

  const validation = validationJson as FormFieldValidation;
  const min = validation.min != null ? Number(validation.min) : undefined;
  const max = validation.max != null ? Number(validation.max) : undefined;
  const weight = validation.weight != null ? Number(validation.weight) : undefined;
  const critical = validation.critical === true;

  if (min == null && max == null && weight == null && !critical) return undefined;

  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    weight: Number.isFinite(weight) && weight! > 0 ? weight : undefined,
    critical: critical || undefined,
  };
}

function mapBackendField(field: BackendFormField): FormField {
  const options = parseFieldOptions(field.options_json);
  const validation = parseFieldValidation(field.validation_json);

  return {
    id: String(field.id),
    label: field.label,
    type: field.field_type as FormField["type"],
    required: field.is_required,
    section: field.help_text ?? undefined,
    options,
    validation,
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
  return fields
    .map((field, index) => ({
      label: field.label.trim(),
      field_type: field.type,
      placeholder: null,
      help_text: field.section ?? null,
      is_required: field.required,
      options_json: field.options ?? null,
      validation_json: field.validation ?? null,
      sort_order: index,
    }))
    .filter((field) => field.label.length > 0);
}

function toBackendPayload(template: FormTemplate): BackendFormTemplateCreate {
  const isDraft = template.status === "Draft";
  const title = template.name.trim() || "Untitled Form";

  return {
    title,
    description: template.description?.trim() || null,
    form_type: isDraft ? "draft" : template.category?.trim() || "Checklist",
    outlet_id: null,
    is_active: template.status === "Active",
    fields: toBackendFields(ensureResponsiblePersonField(template.fields)),
  };
}

export function validateFormTemplateForSave(template: FormTemplate): string | null {
  if (!template.name.trim()) {
    return "Nama template wajib diisi.";
  }

  const emptyLabels = template.fields.filter((field) => !field.label.trim());
  if (emptyLabels.length > 0) {
    return "Setiap item form harus memiliki label.";
  }

  return null;
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
    const validationError = validateFormTemplateForSave(template);
    if (validationError) {
      throw new Error(validationError);
    }

    const created = await api<BackendFormTemplate>("/api/v1/form-templates", {
      method: "POST",
      body: JSON.stringify(toBackendPayload(template)),
    });

    return mapBackendFormTemplate(created);
  },

  async update(templateId: string, template: FormTemplate) {
    const validationError = validateFormTemplateForSave(template);
    if (validationError) {
      throw new Error(validationError);
    }

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

  async duplicate(templateId: string) {
    const duplicated = await api<BackendFormTemplate>(
      `/api/v1/form-templates/${templateId}/duplicate`,
      { method: "POST" }
    );

    return mapBackendFormTemplate(duplicated);
  },
};
