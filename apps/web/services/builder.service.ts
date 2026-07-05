import { api } from "./api";

export type BuilderDocumentResponse = {
  id: number;
  title: string;
  description?: string | null;
  version: number;
  status: string;
  document_json: unknown;
  created_by?: number | null;
};

export type SaveBuilderDocumentPayload = {
  title: string;
  description?: string;
  version: number;
  status: string;
  document_json: unknown;
  created_by?: number | null;
};

export function saveBuilderDocument(payload: SaveBuilderDocumentPayload) {
  return api<BuilderDocumentResponse>("/builder-documents", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBuilderDocuments() {
  return api<BuilderDocumentResponse[]>("/builder-documents");
}

export function getBuilderDocument(id: number) {
  return api<BuilderDocumentResponse>(`/builder-documents/${id}`);
}

export function publishBuilderDocument(id: number) {
  return api<BuilderDocumentResponse>(`/builder-documents/${id}/publish`, {
    method: "POST",
  });
}
