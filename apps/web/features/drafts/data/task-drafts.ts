import { Task } from "@/features/tasks/types";

export type DraftCenterItem = {
  id: string;
  sourceType: "Task Execution";
  title: string;
  outlet: string;
  operatorName: string;
  status: "Draft";
  updatedAt: string;
  taskId: string;
  formTemplateId?: string;
};

export function getTaskExecutionDrafts(tasks: Task[]): DraftCenterItem[] {
  return tasks
    .filter((task) => Boolean(task.executionDraft))
    .map((task) => ({
      id: `DRAFT-${task.id}`,
      sourceType: "Task Execution",
      title: task.title,
      outlet: task.outlet,
      operatorName: task.executionDraft?.operatorName || "Outlet Operator",
      status: "Draft",
      updatedAt: "Just now",
      taskId: task.id,
      formTemplateId: task.formTemplateId,
    }));
}
