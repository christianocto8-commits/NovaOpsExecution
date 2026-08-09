import type { FormField } from "@/features/forms/types";
import {
  getResponsiblePersonField,
  isResponsiblePersonField,
} from "@/features/forms/utils/system-fields";

export type FormTemplateSettings = {
  require_execution_note: boolean;
  requires_approval: boolean;
};

const DEFAULT_TEMPLATE_SETTINGS: FormTemplateSettings = {
  require_execution_note: true,
  requires_approval: false,
};

export function getTemplateSettings(fields: FormField[]): FormTemplateSettings {
  const responsibleField = getResponsiblePersonField(fields);
  const requireExecutionNote = responsibleField?.options?.require_execution_note;
  const requiresApproval = responsibleField?.options?.requires_approval;

  return {
    require_execution_note:
      requireExecutionNote === undefined
        ? DEFAULT_TEMPLATE_SETTINGS.require_execution_note
        : requireExecutionNote,
    requires_approval:
      requiresApproval === undefined
        ? DEFAULT_TEMPLATE_SETTINGS.requires_approval
        : requiresApproval,
  };
}

export function setTemplateRequireExecutionNote(
  fields: FormField[],
  requireExecutionNote: boolean
): FormField[] {
  return fields.map((field) => {
    if (!isResponsiblePersonField(field)) {
      return field;
    }

    return {
      ...field,
      options: {
        ...field.options,
        system: true,
        require_execution_note: requireExecutionNote,
      },
    };
  });
}

export function setTemplateRequiresApproval(
  fields: FormField[],
  requiresApproval: boolean
): FormField[] {
  return fields.map((field) => {
    if (!isResponsiblePersonField(field)) {
      return field;
    }

    return {
      ...field,
      options: {
        ...field.options,
        system: true,
        requires_approval: requiresApproval,
      },
    };
  });
}
