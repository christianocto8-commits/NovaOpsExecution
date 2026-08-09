import type { Task } from "@/features/tasks/types";

import type { CurrentWorkspace } from "./role-config";

export type OutletScopeContext = Pick<
  CurrentWorkspace,
  "mode" | "outletId" | "outletName" | "outletCode" | "legacyOutletId"
>;

export function taskBelongsToWorkspace(task: Task, workspace: OutletScopeContext) {
  if (workspace.mode !== "outlet") {
    return true;
  }

  if (workspace.legacyOutletId != null && task.outletId === String(workspace.legacyOutletId)) {
    return true;
  }

  if (workspace.outletId && task.outletId === workspace.outletId) {
    return true;
  }

  if (
    workspace.legacyOutletId != null &&
    task.targetOutletIds?.includes(String(workspace.legacyOutletId))
  ) {
    return true;
  }

  if (workspace.outletId && task.targetOutletIds?.includes(workspace.outletId)) {
    return true;
  }

  if (workspace.outletName && task.outlet === workspace.outletName) {
    return true;
  }

  if (workspace.outletName && task.targetOutlets?.includes(workspace.outletName)) {
    return true;
  }

  return false;
}

export function filterTasksForWorkspace(tasks: Task[], workspace: OutletScopeContext) {
  if (workspace.mode !== "outlet") {
    return tasks;
  }

  // Backend already scopes GET /tasks by X-Outlet-Id / identity sync (legacy outlet id).
  // When local workspace cache lacks legacyOutletId, client-side ID matching would hide
  // valid API results (task.outletId is legacy numeric, workspace.outletId is UUID).
  if (workspace.legacyOutletId == null) {
    return tasks;
  }

  return tasks.filter((task) => taskBelongsToWorkspace(task, workspace));
}
