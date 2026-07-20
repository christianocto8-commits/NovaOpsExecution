import type { FormField } from "@/features/forms/types";
import { createLocalId } from "@/lib/local-id";

export const RESPONSIBLE_PERSON_FIELD_TYPE = "responsible_person" as const;
export const RESPONSIBLE_PERSON_FIELD_LABEL = "Nama pelaksana / PIC";
export const RESPONSIBLE_PERSON_SECTION = "Pelaksana Tugas";
export const RESPONSIBLE_PERSON_RESPONSE_KEY = "__responsible_person__";

export function isResponsiblePersonField(field: FormField) {
  return field.type === RESPONSIBLE_PERSON_FIELD_TYPE;
}

export function createResponsiblePersonField(): FormField {
  return {
    id: `local-field-responsible-${createLocalId()}`,
    label: RESPONSIBLE_PERSON_FIELD_LABEL,
    type: RESPONSIBLE_PERSON_FIELD_TYPE,
    required: true,
    section: RESPONSIBLE_PERSON_SECTION,
    options: { system: true },
  };
}

export function ensureResponsiblePersonField(fields: FormField[]) {
  const otherFields = fields.filter((field) => !isResponsiblePersonField(field));

  return [createResponsiblePersonField(), ...otherFields];
}

export function getResponsiblePersonField(fields: FormField[]) {
  return fields.find(isResponsiblePersonField);
}

export function getResponsiblePersonValue(fields: FormField[], responses: Record<string, string>) {
  const field = getResponsiblePersonField(fields);

  if (field) {
    return responses[field.id]?.trim() ?? "";
  }

  return responses[RESPONSIBLE_PERSON_RESPONSE_KEY]?.trim() ?? "";
}

export function isResponsiblePersonFilled(fields: FormField[], responses: Record<string, string>) {
  return getResponsiblePersonValue(fields, responses).length > 0;
}
