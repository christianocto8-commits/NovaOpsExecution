import { api } from "@/services/api";
import type { FormField } from "@/features/forms/types";
import { getVisibleFields } from "@/features/forms/utils/field-visibility";
import {
  isMoneyAmountFilled,
  isMoneyDenominationFilled,
  parseDigits,
  parseMoneyDenomination,
} from "@/features/forms/utils/money";
import { getResponsiblePersonValue } from "@/features/forms/utils/system-fields";
import type { TaskFormResponses } from "@/features/tasks/types";

export type FormSubmissionAnswerPayload = {
  form_field_id: number;
  answer_text?: string | null;
  answer_number?: number | null;
  answer_boolean?: boolean | null;
  answer_json?: unknown;
  evidence_url?: string | null;
};

export type FormSubmissionCreatePayload = {
  form_template_id: number;
  outlet_id: number;
  submitted_by?: number | null;
  status?: string;
  score?: number | null;
  responsible_person_name?: string | null;
  answers: FormSubmissionAnswerPayload[];
};

export type FormSubmissionResponse = {
  id: number;
  form_template_id: number;
  outlet_id: number;
  outlet_name?: string | null;
  submitted_by: number;
  reviewed_by: number | null;
  status: string;
  score: number | null;
  responsible_person_name: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  answers: FormSubmissionAnswerPayload[];
};

function buildAnswers(fields: FormField[], responses: TaskFormResponses) {
  return fields
    .map((field) => {
      const fieldId = Number(field.id);
      if (!Number.isFinite(fieldId)) return null;

      const raw = responses[field.id]?.trim() ?? "";

      if (field.type === "yes_no") {
        const normalized = raw.toLowerCase();
        return {
          form_field_id: fieldId,
          answer_boolean:
            normalized === "yes" || normalized === "true" || normalized === "1",
        };
      }

      if (field.type === "number") {
        return {
          form_field_id: fieldId,
          answer_number: raw ? Number(raw) : null,
        };
      }

      if (field.type === "money_amount") {
        return {
          form_field_id: fieldId,
          answer_number: isMoneyAmountFilled(raw) ? parseDigits(raw) : null,
        };
      }

      if (field.type === "money_denomination") {
        const parsed = parseMoneyDenomination(raw);

        return {
          form_field_id: fieldId,
          answer_json: parsed,
          answer_number: parsed?.total ?? null,
        };
      }

      if (field.type === "photo" || field.type === "signature") {
        return {
          form_field_id: fieldId,
          answer_text: raw || null,
          evidence_url: raw || null,
        };
      }

      if (field.type === "responsible_person") {
        return {
          form_field_id: fieldId,
          answer_text: raw || null,
        };
      }

      return {
        form_field_id: fieldId,
        answer_text: raw || null,
      };
    })
    .filter((answer) => answer !== null) as FormSubmissionAnswerPayload[];
}

export function buildFormSubmissionCreatePayload(args: {
  templateId: string;
  outletId: number;
  fields: FormField[];
  responses: TaskFormResponses;
}): FormSubmissionCreatePayload {
  const visibleFields = getVisibleFields(args.fields, args.responses);

  return {
    form_template_id: Number(args.templateId),
    outlet_id: args.outletId,
    status: "submitted",
    responsible_person_name: getResponsiblePersonValue(args.fields, args.responses) || null,
    answers: buildAnswers(visibleFields, args.responses),
  };
}

export const formSubmissionService = {
  async list(params?: { outletId?: number; formTemplateId?: number; status?: string }) {
    const searchParams = new URLSearchParams();

    if (params?.outletId !== undefined) {
      searchParams.set("outlet_id", String(params.outletId));
    }

    if (params?.formTemplateId !== undefined) {
      searchParams.set("form_template_id", String(params.formTemplateId));
    }

    if (params?.status) {
      searchParams.set("status", params.status);
    }

    const query = searchParams.toString();

    return api<FormSubmissionResponse[]>(
      `/api/v1/form-submissions${query ? `?${query}` : ""}`
    );
  },

  async create(payload: FormSubmissionCreatePayload) {
    return api("/api/v1/form-submissions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async review(submissionId: number, review: "approved" | "rejected", note?: string) {
    return api<FormSubmissionResponse>(`/api/v1/form-submissions/${submissionId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ review, note: note ?? null }),
    });
  },

  submitManualForm(args: {
    templateId: string;
    outletId: number;
    fields: FormField[];
    responses: TaskFormResponses;
  }) {
    return formSubmissionService.create(buildFormSubmissionCreatePayload(args));
  },
};
