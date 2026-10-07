import type { Task } from "@/features/tasks/types";

import type { CurrentWorkspace } from "./role-config";

export type OutletScopeContext = Pick<
  CurrentWorkspace,
  "mode" | "outletId" | "outletName" | "outletCode" | "legacyOutletId"
>;

export function taskBelongsToWorkspace(task: Task, workspace: OutletScopeContext) {
  // If no specific outlet is selected and not in outlet mode, all tasks belong to workspace
  if (!workspace.outletId && !workspace.outletName && workspace.mode !== "outlet") {
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
  // If no outlet filter is active and not an outlet-only workspace, show all
  if (!workspace.outletId && !workspace.outletName && workspace.mode !== "outlet") {
    return tasks;
  }

  return tasks.filter((task) => taskBelongsToWorkspace(task, workspace));
}
