import type {
  Edge,
  Viewport,
} from "@xyflow/react";

import type {
  WorkflowBuilderDraft,
  WorkflowBuilderNode,
} from "@/features/workflow-builder/types/builder";

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

