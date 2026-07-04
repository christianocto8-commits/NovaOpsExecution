import { useWorkflowContext } from "../providers/workflow-context";

export function useWorkflow() {
  return useWorkflowContext();
}
