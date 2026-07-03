import { api } from "./api";

export type RuntimeTemplate = {
  id: number;
  builder_document_id: number;
  title: string;
  description?: string | null;
  version: number;
  status: string;
  runtime_json: unknown;
};

export function getRuntimeTemplates() {
  return api<RuntimeTemplate[]>("/runtime-templates");
}

export function getRuntimeTemplate(id: number) {
  return api<RuntimeTemplate>(`/runtime-templates/${id}`);
}