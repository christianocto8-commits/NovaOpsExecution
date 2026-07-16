"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { getFormTemplate } from "@/features/forms/data/mock-form-templates";
import {
  OutletTaskExecutionDrawer,
  TaskDetailDrawer,
  TaskFormDrawer,
} from "@/features/tasks/components";
import { useTaskWorkspace } from "@/features/tasks/hooks/use-task-workspace";
import { Task } from "@/features/tasks/types";
import { formatTaskSchedule } from "@/features/tasks/utils";
import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";
import { calculateFormProgress, ProgressChip } from "@/shared/form-progress";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import {
  setCorrectiveAction,
  updateOutletTaskStoreItem,
  upsertOutletTaskStoreItem,
} from "@/shared/outlet-task-store";
import { RealtimeClock } from "@/shared/realtime";

function getTaskDraftProgress(task: Task) {
  if (!task.executionDraft || !task.formTemplateId) return null;

  const template = getFormTemplate(task.formTemplateId);
  if (!template) return null;

  const progressFields = template.fields.map((field) => ({
    id: field.id,
    label: field.label,
    required: field.required,
  }));

  return calculateFormProgress(progressFields, task.executionDraft.formResponses);
}

function getTaskExecutionProgressPercentage(task: Task) {
  const draftProgress = getTaskDraftProgress(task);

  if (draftProgress) return draftProgress.percentage;

  const normalizedStatus = String(task.status).toLowerCase();

  if (
    normalizedStatus.includes("completed") ||
    normalizedStatus.includes("submitted") ||
    normalizedStatus.includes("done")
  ) {
    return 100;
  }

  return 0;
}

function getOutletTaskExecutionMetrics(tasks: Task[]) {
  const total = tasks.length;
  const completed = tasks.filter((task) => getTaskExecutionProgressPercentage(task) === 100).length;
  const draft = tasks.filter((task) => task.executionDraft).length;
  const pending = tasks.filter((task) => getTaskExecutionProgressPercentage(task) === 0).length;

  const averageProgress =
    total > 0
      ? Math.round(
          tasks.reduce((sum, task) => sum + getTaskExecutionProgressPercentage(task), 0) / total
        )
      : 0;

  return {
    total,
    completed,
    draft,
    pending,
    averageProgress,
  };
}

function syncTaskToOutletTaskStore(task: Task) {
  const progress = getTaskExecutionProgressPercentage(task);
  const hasDraft = Boolean(task.executionDraft);

  const normalizedStatus = String(task.status).toLowerCase();

  const status =
    normalizedStatus.includes("completed") ||
    normalizedStatus.includes("submitted") ||
    normalizedStatus.includes("done")
      ? "submitted"
      : hasDraft
        ? "draft"
        : "pending";

  upsertOutletTaskStoreItem({
    id: task.id,
    outlet: task.outlet,
    task: task.title,
    form: task.formTemplateId ?? "-",
    status,
    progress,
    score: progress,
    operator: hasDraft ? "Outlet Operator" : "-",
    due: formatTaskSchedule(task),
    submittedAt: status === "submitted" ? "Realtime" : hasDraft ? "Saved Draft" : "-",
    updatedAt: "Realtime",
    correctiveActionStatus: task.execution?.reviewStatus === "rejected" ? "open" : undefined,
    correctiveActionOwner:
      task.execution?.reviewStatus === "rejected" ? "Store Manager" : undefined,
    correctiveActionDue: task.execution?.reviewStatus === "rejected" ? "Today 18:00" : undefined,
    correctiveActionNote:
      task.execution?.reviewStatus === "rejected"
        ? (task.execution.reviewNote ?? "Evidence rejected. Correct and resubmit task evidence.")
        : undefined,
  });
}

export function TasksWorkspace() {
  const searchParams = useSearchParams();
  const continuedDraftRef = useRef<string | null>(null);
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const {
    tasks,
    selectedTask,
    isFormOpen,
    isEditingTask,
    taskForm,
    setTaskForm,
    openCreateTask,
    openEditTask,
    closeTaskForm,
    submitTaskForm,
    openTaskDetail,
    closeDetail,
    reviewTaskExecution,
    deleteTask,
    executionForm,
    setExecutionForm,
    isExecutionOpen,
    openExecution,
    closeExecution,
    cancelExecutionChanges,
    saveExecutionDraft,
    submitTaskExecution,
    isBackendConnected,
  } = useTaskWorkspace();

  const isOutletWorkspace = workspace.mode === "outlet";
  const isOutletRole = isOutletWorkspace;
  const canCreateTask = !isOutletRole;

  useEffect(() => {
    const continueDraftTaskId = searchParams.get("continueDraft");

    if (!isOutletWorkspace || !continueDraftTaskId) return;
    if (continuedDraftRef.current === continueDraftTaskId) return;

    const draftTask = tasks.find((task) => task.id === continueDraftTaskId && task.executionDraft);

    if (!draftTask) return;

    continuedDraftRef.current = continueDraftTaskId;

    window.setTimeout(() => {
      setHighlightedTaskId(continueDraftTaskId);
    }, 0);

    window.setTimeout(() => {
      const row = document.querySelector(`[data-task-row-id="${continueDraftTaskId}"]`);

      row?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);

    window.setTimeout(() => {
      openExecution(draftTask);
    }, 500);

    window.setTimeout(() => {
      setHighlightedTaskId(null);
    }, 3500);
  }, [isOutletWorkspace, searchParams, tasks, openExecution]);

  const outletScopedTasks = useMemo(() => {
    if (!isOutletWorkspace) return tasks;
    if (isBackendConnected) return tasks;

    return tasks.filter((task) => task.outlet === (workspace.outletName ?? ""));
  }, [isBackendConnected, isOutletWorkspace, tasks, workspace.outletName]);

  const visibleTasks = useMemo(() => outletScopedTasks, [outletScopedTasks]);

  const outletTaskMetrics = useMemo(
    () => getOutletTaskExecutionMetrics(visibleTasks),
    [visibleTasks]
  );

  useEffect(() => {
    visibleTasks.forEach((task) => {
      syncTaskToOutletTaskStore(task);
    });
  }, [visibleTasks]);

  const columns: EnterpriseColumn<Task>[] = [
    {
      key: "title",
      header: "Task",
      render: (task) => {
        const isHighlighted = highlightedTaskId === task.id;

        return (
          <div
            data-task-row-id={task.id}
            className={`rounded-2xl p-2 transition-all duration-500 ${
              isHighlighted ? "bg-emerald-50 ring-2 ring-emerald-300" : ""
            }`}
          >
            <p className="font-semibold text-slate-950">{task.title}</p>
            <p className="text-xs text-slate-500">{task.id}</p>
          </div>
        );
      },
    },
    { key: "outlet", header: "Outlet" },
    {
      key: "priority",
      header: "Priority",
      render: (task) => (
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          {task.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (task) => {
        const draftProgress = getTaskDraftProgress(task);

        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {task.status}
            </span>

            {draftProgress ? (
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Draft
                </span>
                <ProgressChip percentage={draftProgress.percentage} />
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "formTemplateId",
      header: "Form",
      render: (task) => task.formTemplateId ?? "-",
    },
    {
      key: "due",
      header: "Due",
      render: (task) => formatTaskSchedule(task),
    },
    {
      key: "id",
      header: "Actions",
      render: (task) =>
        isOutletRole ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setHighlightedTaskId(task.id);
              openExecution(task);

              window.setTimeout(() => {
                setHighlightedTaskId(null);
              }, 2500);
            }}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
          >
            {task.executionDraft ? "Continue" : "Execute"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openTaskDetail(task);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              View
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openEditTask(task);
              }}
              className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void deleteTask(task.id);
              }}
              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ),
    },
  ];

  function handleOpenTask(task: Task) {
    setHighlightedTaskId(task.id);

    if (isOutletRole) {
      openExecution(task);
    } else {
      openTaskDetail(task);
    }

    window.setTimeout(() => {
      setHighlightedTaskId(null);
    }, 2500);
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Task Execution</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {isOutletWorkspace ? `${workspace.outletName ?? "Outlet"} Tasks` : "Task"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isOutletWorkspace
              ? "Complete assigned outlet tasks or continue saved drafts."
              : "Assign, execute, and verify outlet work, evidence, and corrective actions."}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Realtime
            </span>
            <RealtimeClock />
          </div>
          <span
            className={`inline-flex items-center rounded-2xl px-4 py-2 text-xs font-bold ${
              isBackendConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {isBackendConnected ? "Backend synced" : "Demo fallback"}
          </span>
        </div>

        {!isOutletWorkspace ? (
          <div className="flex flex-wrap gap-2">
            {canCreateTask ? (
              <button
                type="button"
                onClick={openCreateTask}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
              >
                Create Task
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Tasks</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{outletTaskMetrics.total}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{outletTaskMetrics.pending}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Draft / In Progress</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{outletTaskMetrics.draft}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completed / Submitted</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{outletTaskMetrics.completed}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Compliance Completion</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {outletTaskMetrics.averageProgress}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-700 transition-all duration-700"
              style={{ width: `${outletTaskMetrics.averageProgress}%` }}
            />
          </div>
        </div>
      </div>

      <EnterpriseDataTable
        title="Outlet Task Queue"
        description={
          isOutletRole
            ? "Complete required task evidence or continue saved drafts."
            : "Assign tasks, review evidence, and monitor compliance."
        }
        columns={columns}
        data={visibleTasks}
        getRowId={(task) => task.id}
        onRowClick={handleOpenTask}
      />

      {canCreateTask ? (
        <TaskFormDrawer
          open={isFormOpen}
          mode={isEditingTask ? "edit" : "create"}
          form={taskForm}
          onClose={closeTaskForm}
          onChange={setTaskForm}
          onSubmit={submitTaskForm}
        />
      ) : null}

      {!isOutletRole ? (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={closeDetail}
          onEdit={openEditTask}
          onReview={(taskId, review, note) => {
            reviewTaskExecution(taskId, review, note);

            if (review === "approved") {
              updateOutletTaskStoreItem(taskId, {
                status: "completed",
                progress: 100,
                score: 100,
                correctiveActionStatus: "resolved",
                correctiveActionResolvedAt: "Realtime",
              });
              return;
            }

            updateOutletTaskStoreItem(taskId, {
              status: "draft",
              score: 55,
              correctiveActionStatus: "open",
              correctiveActionOwner: "Store Manager",
              correctiveActionDue: "Today 18:00",
              correctiveActionNote: note,
            });
            setCorrectiveAction(taskId, {
              status: "open",
              owner: "Store Manager",
              due: "Today 18:00",
              note,
            });
          }}
        />
      ) : null}

      {isOutletRole ? (
        <OutletTaskExecutionDrawer
          open={isExecutionOpen}
          task={selectedTask}
          form={executionForm}
          onClose={closeExecution}
          onChange={setExecutionForm}
          onCancel={cancelExecutionChanges}
          onSaveDraft={() => {
            if (selectedTask) {
              updateOutletTaskStoreItem(selectedTask.id, {
                status: "draft",
                progress: getTaskExecutionProgressPercentage(selectedTask),
                score: getTaskExecutionProgressPercentage(selectedTask),
                operator: "Outlet Operator",
                submittedAt: "Saved Draft",
              });
            }

            saveExecutionDraft();
          }}
          onSubmit={submitTaskExecution}
        />
      ) : null}
    </main>
  );
}
