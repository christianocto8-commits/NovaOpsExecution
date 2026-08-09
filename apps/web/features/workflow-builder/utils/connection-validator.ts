import type { Connection, Edge } from "@xyflow/react";

import type { WorkflowBuilderNode } from "@/features/workflow-builder/types/builder";

export type ConnectionValidationResult = {
  valid: boolean;
  message: string | null;
};

type ValidateConnectionInput = {
  connection: Connection;
  nodes: WorkflowBuilderNode[];
  edges: Edge[];
};

export function validateWorkflowConnection({
  connection,
  nodes,
  edges,
}: ValidateConnectionInput): ConnectionValidationResult {
  const { source, target, sourceHandle, targetHandle } = connection;

  if (!source || !target) {
    return {
      valid: false,
      message: "Connection source and target are required.",
    };
  }

  if (source === target) {
    return {
      valid: false,
      message: "A node cannot connect to itself.",
    };
  }

  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode) {
    return {
      valid: false,
      message: "Connection references an unknown node.",
    };
  }

  if (sourceNode.type === "end") {
    return {
      valid: false,
      message: "End nodes cannot have outgoing connections.",
    };
  }

  if (targetNode.type === "start") {
    return {
      valid: false,
      message: "Start nodes cannot have incoming connections.",
    };
  }

  const isDuplicate = edges.some(
    (edge) =>
      edge.source === source &&
      edge.target === target &&
      (edge.sourceHandle ?? null) === (sourceHandle ?? null) &&
      (edge.targetHandle ?? null) === (targetHandle ?? null)
  );

  if (isDuplicate) {
    return {
      valid: false,
      message: "This connection already exists.",
    };
  }

  return {
    valid: true,
    message: null,
  };
}

export function getWorkflowEdgeLabel(
  sourceNode: WorkflowBuilderNode | undefined
): string | undefined {
  if (sourceNode?.type === "condition") {
    return "Branch";
  }

  return undefined;
}
