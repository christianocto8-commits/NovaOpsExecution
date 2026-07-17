import { api } from "@/services/api";
import type { WorkflowBuilderDraft } from "@/features/workflow-builder/types/builder";

export type BuilderDocument = {
  id: number;
  title: string;
  description: string | null;
  version: number;
  status: string;
  document_json: Record<string, unknown>;
  created_by: number | null;
};

type BuilderDocumentPayload = {
  title: string;
  description: string | null;
  version: number;
  status: string;
  document_json: Record<string, unknown>;
};

function toPayload(draft: WorkflowBuilderDraft): BuilderDocumentPayload {
  return {
    title: draft.name.trim() || "Untitled Workflow",
    description: null,
    version: 1,
    status: "draft",
    document_json: {
      schemaVersion: draft.schemaVersion,
      nodes: draft.nodes,
      edges: draft.edges,
      viewport: draft.viewport,
    },
  };
}

export function mapBuilderDocumentToDraft(document: BuilderDocument): WorkflowBuilderDraft {
  const payload = document.document_json as Partial<WorkflowBuilderDraft>;

  return {
    schemaVersion: 1,
    workflowId: String(document.id),
    name: document.title,
    nodes: (payload.nodes as WorkflowBuilderDraft["nodes"]) ?? [],
    edges: (payload.edges as WorkflowBuilderDraft["edges"]) ?? [],
    viewport: payload.viewport ?? { x: 0, y: 0, zoom: 1 },
    updatedAt: new Date().toISOString(),
  };
}

export const builderDocumentService = {
  list() {
    return api<BuilderDocument[]>("/api/v1/builder-documents");
  },

  get(documentId: string) {
    return api<BuilderDocument>(`/api/v1/builder-documents/${documentId}`);
  },

  create(draft: WorkflowBuilderDraft) {
    return api<BuilderDocument>("/api/v1/builder-documents", {
      method: "POST",
      body: JSON.stringify(toPayload(draft)),
    });
  },

  update(documentId: string, draft: WorkflowBuilderDraft) {
    return api<BuilderDocument>(`/api/v1/builder-documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(toPayload(draft)),
    });
  },

  publish(documentId: string) {
    return api<BuilderDocument>(`/api/v1/builder-documents/${documentId}/publish`, {
      method: "POST",
    });
  },
};
