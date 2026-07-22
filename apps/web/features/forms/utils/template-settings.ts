import type { FormField } from "@/features/forms/types";
import { getResponsiblePersonField, isResponsiblePersonField } from "@/features/forms/utils/system-fields";

export type FormTemplateSettings = {
  require_execution_note: boolean;
};

const DEFAULT_TEMPLATE_SETTINGS: FormTemplateSettings = {
  require_execution_note: true,
};

export function getTemplateSettings(fields: FormField[]): FormTemplateSettings {
  const responsibleField = getResponsiblePersonField(fields);
  const requireExecutionNote = responsibleField?.options?.require_execution_note;

  return {
    require_execution_note:
      requireExecutionNote === undefined ? DEFAULT_TEMPLATE_SETTINGS.require_execution_note : requireExecutionNote,
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
