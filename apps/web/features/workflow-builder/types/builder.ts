import type { Edge, Node, Viewport } from "@xyflow/react";

export type WorkflowBuilderNodeType =
  | "start"
  | "end"
  | "approval"
  | "condition"
  | "notification"
  | "escalation"
  | "delay"
  | "task"
  | "form";

export type ApprovalMode = "single" | "any" | "all" | "sequential";

export type ApprovalNodeConfiguration = {
  approverType: "role" | "user" | "outlet" | "owner";
  approverLabel: string;
  approvalMode: ApprovalMode;
  slaHours: number | null;
};

export type WorkflowBuilderNodeData = {
  label: string;
  description?: string;
  nodeType: WorkflowBuilderNodeType;
  approval?: ApprovalNodeConfiguration;
};

export type WorkflowBuilderNode = Node<WorkflowBuilderNodeData, WorkflowBuilderNodeType>;

export type WorkflowBuilderDraft = {
  schemaVersion: 1;
  workflowId: string | null;
  name: string;
  nodes: WorkflowBuilderNode[];
  edges: Edge[];
  viewport: Viewport;
  updatedAt: string;
};
