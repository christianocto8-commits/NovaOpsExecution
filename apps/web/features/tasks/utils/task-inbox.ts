import type { Task } from "@/features/tasks/types";

export function isTaskRejectedForRework(task: Task) {
  return task.execution?.reviewStatus === "rejected";
}

export function isTaskCompleted(task: Task) {
  if (isTaskRejectedForRework(task)) return false;

  const status = String(task.status).toLowerCase();
  const backendStatus = String(task.backendStatus ?? "").toLowerCase();

  if (status.includes("completed") || backendStatus === "completed") {
    return true;
  }

  if (task.execution?.completedAt && !task.executionDraft) {
    return true;
  }

  return false;
}

/** Tasks that should stay in the Task inbox (not yet finished). */
export function isOpenTaskInInbox(task: Task) {
  if (String(task.backendStatus ?? "").toLowerCase() === "cancelled") {
    return false;
  }

  return !isTaskCompleted(task);
}

/** Tasks with a submitted result — shown in Reports / PDF export. */
export function isTaskWorkedOn(task: Task) {
  return isTaskCompleted(task) || Boolean(task.execution?.completedAt);
}
