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

export function isTaskExpiredOverdue(task: Task) {
  if (isTaskCompleted(task)) {
    return false;
  }

  const backendStatus = String(task.backendStatus ?? "").toLowerCase();

  if (backendStatus === "cancelled") {
    return false;
  }

  return Boolean(task.expiredAt);
}

/** Task past its due date and not completed/cancelled (regardless of expiry). */
export function isTaskOverdue(task: Task) {
  if (isTaskCompleted(task)) {
    return false;
  }

  const backendStatus = String(task.backendStatus ?? "").toLowerCase();

  if (backendStatus === "cancelled") {
    return false;
  }

  if (!task.due) {
    return false;
  }

  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

/** Tasks that should stay in the Task inbox (not yet finished). */
export function isOpenTaskInInbox(task: Task) {
  const backendStatus = String(task.backendStatus ?? "").toLowerCase();

  if (backendStatus === "cancelled" || backendStatus === "expired") {
    return false;
  }

  // Tasks that have been auto-expired (60min after overdue) should leave the queue
  if (task.expiredAt) {
    return false;
  }

  return !isTaskCompleted(task);
}

/** Tasks with a submitted result — shown in Reports / PDF export. */
export function isTaskWorkedOn(task: Task) {
  return isTaskCompleted(task) || Boolean(task.execution?.completedAt) || isTaskOverdue(task);
}
