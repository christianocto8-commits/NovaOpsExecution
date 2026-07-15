import type { WorkflowBuilderNodeType } from "@/features/workflow-builder/types/builder";

export const WORKFLOW_NODE_DRAG_TYPE =
  "application/x-novaops-workflow-node";

export type WorkflowNodeRegistryItem = {
  type: WorkflowBuilderNodeType;
  label: string;
  description: string;
  group: "flow" | "action" | "logic";
  icon:
    | "play"
    | "square"
    | "check"
    | "gitBranch"
    | "bell"
    | "triangleAlert"
    | "clock"
    | "clipboardCheck"
    | "fileText";
};

export const workflowNodeRegistry: WorkflowNodeRegistryItem[] = [
  {
    type: "start",
    label: "Start",
    description: "Workflow entry point.",
    group: "flow",
    icon: "play",
  },
  {
    type: "end",
    label: "End",
    description: "Workflow completion point.",
    group: "flow",
    icon: "square",
  },
  {
    type: "approval",
    label: "Approval",
    description: "Request approval from an assigned approver.",
    group: "action",
    icon: "check",
  },
  {
    type: "notification",
    label: "Notification",
    description: "Send an in-app workflow notification.",
    group: "action",
    icon: "bell",
  },
  {
    type: "escalation",
    label: "Escalation",
    description: "Escalate overdue or unresolved workflow work.",
    group: "action",
    icon: "triangleAlert",
  },
  {
    type: "delay",
    label: "Delay",
    description: "Pause execution for a configured duration.",
    group: "action",
    icon: "clock",
  },
  {
    type: "task",
    label: "Task",
    description: "Create an operational task step.",
    group: "action",
    icon: "clipboardCheck",
  },
  {
    type: "form",
    label: "Form",
    description: "Collect structured workflow information.",
    group: "action",
    icon: "fileText",
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch execution using configured rules.",
    group: "logic",
    icon: "gitBranch",
  },
];

export function getWorkflowNodeDefinition(
  nodeType: WorkflowBuilderNodeType
): WorkflowNodeRegistryItem | undefined {
  return workflowNodeRegistry.find((item) => item.type === nodeType);
}
