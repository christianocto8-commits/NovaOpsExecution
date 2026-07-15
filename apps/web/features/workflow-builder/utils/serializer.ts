import type {
  Edge,
  Viewport,
} from "@xyflow/react";

import type {
  WorkflowBuilderDraft,
  WorkflowBuilderNode,
} from "@/features/workflow-builder/types/builder";

export const WORKFLOW_BUILDER_DRAFT_KEY =
  "novaops_workflow_builder_draft";

type SerializeWorkflowDraftInput = {
  workflowId?: string | null;
  name: string;
  nodes: WorkflowBuilderNode[];
  edges: Edge[];
  viewport: Viewport;
};

export function serializeWorkflowDraft({
  workflowId = null,
  name,
  nodes,
  edges,
  viewport,
}: SerializeWorkflowDraftInput): WorkflowBuilderDraft {
  return {
    schemaVersion: 1,
    workflowId,
    name,
    nodes,
    edges,
    viewport,
    updatedAt: new Date().toISOString(),
  };
}

export function saveWorkflowDraft(
  draft: WorkflowBuilderDraft
): void {
  localStorage.setItem(
    WORKFLOW_BUILDER_DRAFT_KEY,
    JSON.stringify(draft)
  );
}

export function loadWorkflowDraft(): WorkflowBuilderDraft | null {
  const storedDraft = localStorage.getItem(
    WORKFLOW_BUILDER_DRAFT_KEY
  );

  if (!storedDraft) {
    return null;
  }

  try {
    const parsedDraft = JSON.parse(
      storedDraft
    ) as WorkflowBuilderDraft;

    if (
      parsedDraft.schemaVersion !== 1 ||
      !Array.isArray(parsedDraft.nodes) ||
      !Array.isArray(parsedDraft.edges)
    ) {
      return null;
    }

    return parsedDraft;
  } catch {
    return null;
  }
}

export function clearWorkflowDraft(): void {
  localStorage.removeItem(WORKFLOW_BUILDER_DRAFT_KEY);
}

