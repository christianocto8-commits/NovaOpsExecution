import { formTemplates } from "@/features/forms/data/mock-form-templates";
import {
  readStoredFormTemplates,
  writeStoredFormTemplates,
} from "@/features/forms/data/form-template-storage";
import { FormTemplate } from "@/features/forms/types";

export function loadFormTemplateWorkspaceTemplates() {
  const storedTemplates = readStoredFormTemplates();

  return storedTemplates.length > 0 ? storedTemplates : formTemplates;
}

export function saveFormTemplateWorkspaceTemplates(templates: FormTemplate[]) {
  writeStoredFormTemplates(templates);
}

export function getAvailableFormTemplates() {
  const storedTemplates = readStoredFormTemplates();
  const storedTemplateIds = new Set(storedTemplates.map((template) => template.id));

  return [
    ...storedTemplates,
    ...formTemplates.filter((template) => !storedTemplateIds.has(template.id)),
  ].filter((template) => template.status !== "Archived");
}
