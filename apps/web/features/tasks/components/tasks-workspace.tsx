"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";

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

type MobileTaskSection = {
  id: string;
  title: string;
  tasks: Task[];
};

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

function parseTaskDueDate(task: Task) {
  const parsed = new Date(task.due);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getWeekEnd(date: Date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 7);
  return new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatMobileDay(task: Task) {
  const dueDate = parseTaskDueDate(task);
  if (!dueDate) return "-";

  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMobileTime(task: Task) {
  const dueDate = parseTaskDueDate(task);
  if (!dueDate) return "-";

  return dueDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).toLowerCase();
}

function getMobileSections(tasks: Task[], incompleteOnly: boolean) {
  const now = new Date();
  const todayStart = getDayStart(now);
  const weekEnd = getWeekEnd(now);

  const eligibleTasks = incompleteOnly
    ? tasks.filter((task) => getTaskExecutionProgressPercentage(task) < 100)
    : tasks;

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];
  const completed: Task[] = [];

  eligibleTasks.forEach((task) => {
    const progress = getTaskExecutionProgressPercentage(task);
    const dueDate = parseTaskDueDate(task);

    if (progress === 100) {
      completed.push(task);
      return;
    }

    if (!dueDate) {
      later.push(task);
      return;
    }

    if (dueDate < todayStart) {
      overdue.push(task);
      return;
    }

    if (isSameDay(dueDate, now)) {
      today.push(task);
      return;
    }

    if (dueDate <= weekEnd) {
      thisWeek.push(task);
      return;
    }

    later.push(task);
  });

  const sections: MobileTaskSection[] = [
    { id: "overdue", title: `${overdue.length} Overdue`, tasks: overdue },
    { id: "today", title: "Today", tasks: today },
    { id: "due-this-week", title: "Due This Week", tasks: thisWeek },
    { id: "later", title: "Later", tasks: later },
  ];

  if (!incompleteOnly) {
    sections.push({ id: "completed", title: "Completed", tasks: completed });
  }

  return sections.filter((section) => section.tasks.length > 0);
}

function MobileTaskRow({
  task,
  highlighted,
  onOpen,
}: {
  task: Task;
  highlighted: boolean;
  onOpen: () => void;
}) {
  const progress = getTaskExecutionProgressPercentage(task);
  const draftProgress = getTaskDraftProgress(task);
  const isOverdue = (() => {
    const dueDate = parseTaskDueDate(task);
    return dueDate ? dueDate < getDayStart(new Date()) && progress < 100 : false;
  })();

  return (
    <button
      type="button"
      data-task-row-id={task.id}
      onClick={onOpen}
      className={[
        "grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 border-b border-slate-200 px-3 py-4 text-left transition last:border-b-0 hover:bg-slate-50",
        highlighted ? "bg-emerald-50" : "bg-white",
      ].join(" ")}
    >
      <div className="text-center">
        <p className={`text-xs font-semibold ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
          {formatMobileDay(task)}
        </p>
        <p className="mt-2 text-[11px] text-slate-400">{formatMobileTime(task)}</p>
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-800">{task.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {task.executionDraft ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Draft Saved
                </span>
              ) : null}
              {task.priority === "High" ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  Follow-up Task
                </span>
              ) : null}
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-400">{progress}%</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className={isOverdue ? "text-red-500" : "text-sky-500"}>
            {isOverdue ? "Overdue" : task.executionDraft ? "Draft" : "Open"}
          </span>
          {draftProgress ? <ProgressChip percentage={draftProgress.percentage} /> : null}
        </div>
      </div>
    </button>
  );
}

function MobileTaskSectionBlock({
  section,
  highlightedTaskId,
  onOpenTask,
}: {
  section: MobileTaskSection;
  highlightedTaskId: string | null;
  onOpenTask: (task: Task) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-3 py-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-700">{section.title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open ? (
        <div>
          {section.tasks.map((task) => (
            <MobileTaskRow
              key={task.id}
              task={task}
              highlighted={highlightedTaskId === task.id}
              onOpen={() => onOpenTask(task)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
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
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileIncompleteOnly, setMobileIncompleteOnly] = useState(true);

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

  const filteredMobileTasks = useMemo(() => {
    const query = mobileSearch.trim().toLowerCase();

    if (!query) return visibleTasks;

    return visibleTasks.filter((task) => {
      const haystack = [task.title, task.outlet, task.formTemplateId ?? "", task.status]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [mobileSearch, visibleTasks]);

  const mobileSections = useMemo(
    () => getMobileSections(filteredMobileTasks, mobileIncompleteOnly),
    [filteredMobileTasks, mobileIncompleteOnly]
  );

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
    <main className="space-y-5 px-4 py-4 sm:space-y-6 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Task Execution</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {isOutletWorkspace ? `${workspace.outletName ?? "Outlet"} Tasks` : "Task"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isOutletWorkspace
              ? "Kerjakan checklist outlet, simpan draft bila perlu, lalu submit bukti saat selesai."
              : "Assign, execute, and verify outlet work, evidence, and corrective actions."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:rounded-3xl md:p-5">
          <p className="text-xs text-slate-500 md:text-sm">Total Tasks</p>
          <p className="mt-2 text-xl font-bold text-slate-950 md:text-2xl">{outletTaskMetrics.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:rounded-3xl md:p-5">
          <p className="text-xs text-slate-500 md:text-sm">Pending</p>
          <p className="mt-2 text-xl font-bold text-amber-700 md:text-2xl">{outletTaskMetrics.pending}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:rounded-3xl md:p-5">
          <p className="text-xs text-slate-500 md:text-sm">Draft</p>
          <p className="mt-2 text-xl font-bold text-blue-700 md:text-2xl">{outletTaskMetrics.draft}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:rounded-3xl md:p-5">
          <p className="text-xs text-slate-500 md:text-sm">Submitted</p>
          <p className="mt-2 text-xl font-bold text-emerald-700 md:text-2xl">{outletTaskMetrics.completed}</p>
        </div>

        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 md:col-span-1 md:rounded-3xl md:p-5">
          <p className="text-xs text-slate-500 md:text-sm">Completion</p>
          <p className="mt-2 text-xl font-bold text-slate-950 md:text-2xl">
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

      {isOutletRole ? (
        <section className="space-y-3 lg:hidden">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-3 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={mobileSearch}
                  onChange={(event) => setMobileSearch(event.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setMobileIncompleteOnly((current) => !current)}
                  className={`rounded-lg p-1.5 transition ${
                    mobileIncompleteOnly ? "bg-sky-50 text-sky-600" : "text-slate-400"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {mobileIncompleteOnly
                ? `All Incomplete Tasks at ${workspace.outletName ?? "Outlet"}`
                : `All Tasks at ${workspace.outletName ?? "Outlet"}`}
            </div>

            <div className="space-y-3 bg-[#F7FAF8] p-3">
              {mobileSections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No tasks match this view.
                </div>
              ) : (
                mobileSections.map((section) => (
                  <MobileTaskSectionBlock
                    key={section.id}
                    section={section}
                    highlightedTaskId={highlightedTaskId}
                    onOpenTask={handleOpenTask}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}

      <div className={isOutletRole ? "hidden lg:block" : "block"}>
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
      </div>

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
