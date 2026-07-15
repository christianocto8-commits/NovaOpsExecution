import { FormTemplate } from "@/features/forms/types";

export const FORM_TEMPLATE_STORAGE_KEY = "novaops_template_builder_draft";

export function readStoredFormTemplates(): FormTemplate[] {
  if (typeof window === "undefined") return [];

  const rawTemplates = window.localStorage.getItem(FORM_TEMPLATE_STORAGE_KEY);

  if (!rawTemplates) return [];

  try {
    const parsedTemplates = JSON.parse(rawTemplates) as FormTemplate[];

    return Array.isArray(parsedTemplates) ? parsedTemplates : [];
  } catch {
    return [];
  }
}

export function writeStoredFormTemplates(templates: FormTemplate[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(FORM_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}
