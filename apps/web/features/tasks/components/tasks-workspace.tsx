"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { PushNotificationPrompt } from "@/features/notifications/components/push-notification-prompt";
import { PwaInstallPrompt } from "@/features/pwa/components/pwa-install-prompt";
import { ChecklistSubmitResultModal,
  OutletTaskExecutionDrawer,
  TaskDetailDrawer,
  TaskFormDrawer,
} from "@/features/tasks/components";
import type { FormTemplate } from "@/features/forms/types";
import { useTaskWorkspace } from "@/features/tasks/hooks/use-task-workspace";
import { Task } from "@/features/tasks/types";
import { formatTaskSchedule } from "@/features/tasks/utils";
import { queryKeys } from "@/lib/query/keys";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { formTemplateService } from "@/services/form-template.service";
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
import { useLanguage } from "@/shared/i18n";

type MobileTaskSection = {
  id: string;
  title: string;
  tasks: Task[];
};

const TASK_SECTION_COLLAPSE_KEY = "novaops_task_section_collapsed";

function getDefaultSectionCollapsed(sectionId: string, taskCount: number) {
  if (sectionId === "overdue" || sectionId === "today") {
    return false;
  }

  if (sectionId === "due-this-week") {
    return taskCount > 4;
  }

  if (sectionId.startsWith("outlet:")) {
    return taskCount > 3;
  }

  return true;
}

function readStoredCollapseState() {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(TASK_SECTION_COLLAPSE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getTasksGroupedByOutlet(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();

  tasks.forEach((task) => {
    const outletName = task.outlet?.trim() || "Unknown Outlet";
    const current = grouped.get(outletName) ?? [];
    current.push(task);
    grouped.set(outletName, current);
  });

  return [...grouped.entries()]
    .sort(([leftOutlet], [rightOutlet]) => leftOutlet.localeCompare(rightOutlet))
    .map(([outletName, outletTasks]) => ({
      id: `outlet:${outletName}`,
      title: outletName,
      tasks: outletTasks,
    }));
}

function getTaskDraftProgress(task: Task, templates: FormTemplate[]) {
  if (!task.executionDraft || !task.formTemplateId) return null;

  const template = templates.find((item) => item.id === task.formTemplateId);
  if (!template) return null;

  const progressFields = template.fields.map((field) => ({
    id: field.id,
    label: field.label,
    required: field.required,
  }));

  return calculateFormProgress(progressFields, task.executionDraft.formResponses);
}

function getTaskExecutionProgressPercentage(task: Task, templates: FormTemplate[]) {
  const draftProgress = getTaskDraftProgress(task, templates);

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

function getOutletTaskExecutionMetrics(tasks: Task[], templates: FormTemplate[]) {
  const total = tasks.length;
  const completed = tasks.filter(
    (task) => getTaskExecutionProgressPercentage(task, templates) === 100
  ).length;
  const draft = tasks.filter((task) => task.executionDraft).length;
  const pending = tasks.filter(
    (task) => getTaskExecutionProgressPercentage(task, templates) === 0
  ).length;

  const averageProgress =
    total > 0
      ? Math.round(
          tasks.reduce(
            (sum, task) => sum + getTaskExecutionProgressPercentage(task, templates),
            0
          ) / total
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

function syncTaskToOutletTaskStore(task: Task, templates: FormTemplate[]) {
  const progress = getTaskExecutionProgressPercentage(task, templates);
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

function shouldHideOutletOverdueTask(task: Task, now: Date) {
  const dueDate = parseTaskDueDate(task);
  if (!dueDate) return false;

  const dayAfterDue = getDayStart(dueDate);
  dayAfterDue.setDate(dayAfterDue.getDate() + 1);

  if (getDayStart(now) >= dayAfterDue) {
    return true;
  }

  const twoHoursAfterDue = dueDate.getTime() + 2 * 60 * 60 * 1000;
  if (now.getTime() >= twoHoursAfterDue) {
    return true;
  }

  return false;
}

function getMobileSections(tasks: Task[], incompleteOnly: boolean, templates: FormTemplate[]) {
  const now = new Date();
  const todayStart = getDayStart(now);
  const weekEnd = getWeekEnd(now);

  const eligibleTasks = incompleteOnly
    ? tasks.filter((task) => getTaskExecutionProgressPercentage(task, templates) < 100)
    : tasks;

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];
  const completed: Task[] = [];

  eligibleTasks.forEach((task) => {
    const progress = getTaskExecutionProgressPercentage(task, templates);
    const dueDate = parseTaskDueDate(task);

    if (progress < 100 && shouldHideOutletOverdueTask(task, now)) {
      return;
    }

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
  formTemplates,
  isPendingSync,
}: {
  task: Task;
  highlighted: boolean;
  onOpen: () => void;
  formTemplates: FormTemplate[];
  isPendingSync?: boolean;
}) {
  const progress = getTaskExecutionProgressPercentage(task, formTemplates);
  const draftProgress = getTaskDraftProgress(task, formTemplates);
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
        "grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 border-b border-slate-200 px-3 py-5 text-left transition last:border-b-0 hover:bg-slate-50 active:bg-slate-100",
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
              {isPendingSync ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  Menunggu sync
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

function CollapsibleTaskSection({
  section,
  highlightedTaskId,
  onOpenTask,
  formTemplates,
  collapsed,
  onToggle,
  pendingTaskIds,
}: {
  section: MobileTaskSection;
  highlightedTaskId: string | null;
  onOpenTask: (task: Task) => void;
  formTemplates: FormTemplate[];
  collapsed: boolean;
  onToggle: () => void;
  pendingTaskIds: Set<string>;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100 sm:px-4"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{section.title}</span>
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {section.tasks.length} task
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
          {collapsed ? "Tampilkan" : "Sembunyikan"}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {!collapsed ? (
        <div>
          {section.tasks.map((task) => (
            <MobileTaskRow
              key={task.id}
              task={task}
              highlighted={highlightedTaskId === task.id}
              onOpen={() => onOpenTask(task)}
              formTemplates={formTemplates}
              isPendingSync={pendingTaskIds.has(task.id)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TaskGroupedList({
  groups,
  highlightedTaskId,
  onOpenTask,
  formTemplates,
  collapsedGroups,
  onToggleGroup,
  onExpandAll,
  onCollapseAll,
  emptyMessage,
  pendingTaskIds,
}: {
  groups: MobileTaskSection[];
  highlightedTaskId: string | null;
  onOpenTask: (task: Task) => void;
  formTemplates: FormTemplate[];
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (groupId: string, defaultCollapsed: boolean) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  emptyMessage: string;
  pendingTaskIds: Set<string>;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.length > 1 ? (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onExpandAll}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Buka semua
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Sembunyikan semua
          </button>
        </div>
      ) : null}

      {groups.map((section) => {
        const defaultCollapsed = getDefaultSectionCollapsed(section.id, section.tasks.length);
        const collapsed = collapsedGroups[section.id] ?? defaultCollapsed;

        return (
          <CollapsibleTaskSection
            key={section.id}
            section={section}
            highlightedTaskId={highlightedTaskId}
            onOpenTask={onOpenTask}
            formTemplates={formTemplates}
            collapsed={collapsed}
            onToggle={() => onToggleGroup(section.id, defaultCollapsed)}
            pendingTaskIds={pendingTaskIds}
          />
        );
      })}
    </div>
  );
}

export function TasksWorkspace() {
  const { t } = useLanguage();
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    readStoredCollapseState()
  );

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
    deleteTask,
    executionForm,
    setExecutionForm,
    isExecutionOpen,
    openExecution,
    closeExecution,
    cancelExecutionChanges,
    saveExecutionDraft,
    submitTaskExecution,
    submitResult,
    closeSubmitResult,
    isBackendConnected,
    isOnline,
    pendingLocalSyncCount,
  } = useTaskWorkspace();
  const { pendingTaskIds } = useOfflineSync();

  const formTemplatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
  });
  const formTemplates = formTemplatesQuery.data ?? [];

  const isOutletWorkspace = workspace.mode === "outlet";
  const isAreaWorkspace = workspace.mode === "area";
  const isOutletRole = isOutletWorkspace;
  const isOwnerAdminWorkspace = !isOutletWorkspace && !isAreaWorkspace;
  const canCreateTask = isOwnerAdminWorkspace;

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

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!taskId || tasks.length === 0) return;

    const matchedTask = tasks.find((task) => task.id === taskId);
    if (!matchedTask) return;

    setHighlightedTaskId(taskId);

    window.setTimeout(() => {
      if (isOutletRole) {
        openExecution(matchedTask);
      } else {
        openTaskDetail(matchedTask);
      }
    }, 300);

    window.setTimeout(() => {
      setHighlightedTaskId(null);
    }, 3500);
  }, [isOutletRole, openExecution, openTaskDetail, searchParams, tasks]);

  const outletScopedTasks = useMemo(() => {
    if (!isOutletWorkspace) return tasks;
    if (isBackendConnected || !isOnline) return tasks;

    return tasks.filter((task) => task.outlet === (workspace.outletName ?? ""));
  }, [isBackendConnected, isOnline, isOutletWorkspace, tasks, workspace.outletName]);

  const visibleTasks = useMemo(() => {
    return [...outletScopedTasks].sort((left, right) => {
      const leftDraftWeight = left.executionDraft ? 1 : 0;
      const rightDraftWeight = right.executionDraft ? 1 : 0;

      if (leftDraftWeight !== rightDraftWeight) {
        return rightDraftWeight - leftDraftWeight;
      }

      return left.title.localeCompare(right.title);
    });
  }, [outletScopedTasks]);

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
    () => getMobileSections(filteredMobileTasks, mobileIncompleteOnly, formTemplates),
    [filteredMobileTasks, mobileIncompleteOnly, formTemplates]
  );

  const filteredAdminTasks = useMemo(() => {
    const query = mobileSearch.trim().toLowerCase();

    if (!query) return visibleTasks;

    return visibleTasks.filter((task) => {
      const haystack = [task.title, task.outlet, task.formTemplateId ?? "", task.status]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [mobileSearch, visibleTasks]);

  const outletTaskGroups = useMemo(
    () => getTasksGroupedByOutlet(filteredAdminTasks),
    [filteredAdminTasks]
  );

  const activeTaskGroups = isOutletRole ? mobileSections : outletTaskGroups;

  useEffect(() => {
    localStorage.setItem(TASK_SECTION_COLLAPSE_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  function toggleTaskGroup(groupId: string, defaultCollapsed: boolean) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupId]: !(current[groupId] ?? defaultCollapsed),
    }));
  }

  function expandAllTaskGroups() {
    setCollapsedGroups((current) => {
      const next = { ...current };

      activeTaskGroups.forEach((group) => {
        next[group.id] = false;
      });

      return next;
    });
  }

  function collapseAllTaskGroups() {
    setCollapsedGroups((current) => {
      const next = { ...current };

      activeTaskGroups.forEach((group) => {
        next[group.id] = true;
      });

      return next;
    });
  }

  const outletTaskMetrics = useMemo(
    () => getOutletTaskExecutionMetrics(visibleTasks, formTemplates),
    [visibleTasks, formTemplates]
  );

  useEffect(() => {
    visibleTasks.forEach((task) => {
      syncTaskToOutletTaskStore(task, formTemplates);
    });
  }, [visibleTasks, formTemplates]);

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
          <p className="text-sm font-medium text-emerald-700">{t("tasks.eyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {isOutletWorkspace
              ? t("tasks.titleOutlet").replace(
                  "{outlet}",
                  workspace.outletName ?? "Outlet"
                )
              : t("tasks.titleAdmin")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isOutletWorkspace
              ? t("tasks.subtitleOutlet")
              : isAreaWorkspace
                ? t("tasks.subtitleArea")
                : t("tasks.subtitleAdmin")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("tasks.realtime")}
              </span>
              <RealtimeClock />
            </div>
            <span
              className={`inline-flex items-center rounded-2xl px-4 py-2 text-xs font-bold ${
                isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {isOnline ? t("tasks.online") : t("tasks.offline")}
            </span>
            <span
              className={`inline-flex items-center rounded-2xl px-4 py-2 text-xs font-bold ${
                isBackendConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {isBackendConnected ? t("tasks.backendSynced") : t("tasks.backendUnavailable")}
            </span>
            {pendingLocalSyncCount > 0 ? (
              <span className="inline-flex items-center rounded-2xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                {t("tasks.pendingSync").replace("{count}", String(pendingLocalSyncCount))}
              </span>
            ) : null}
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
                {t("tasks.createTask")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOutletWorkspace ? (
        <>
          <PwaInstallPrompt />
          <PushNotificationPrompt />
        </>
      ) : null}

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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={mobileSearch}
              onChange={(event) => setMobileSearch(event.target.value)}
              placeholder="Cari task, outlet, atau status"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {isOutletRole ? (
              <button
                type="button"
                onClick={() => setMobileIncompleteOnly((current) => !current)}
                className={`rounded-lg p-1.5 transition ${
                  mobileIncompleteOnly ? "bg-sky-50 text-sky-600" : "text-slate-400"
                }`}
                title={mobileIncompleteOnly ? t("tasks.incompleteOnly") : t("tasks.allTasks")}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:px-4">
          {isOutletRole
            ? mobileIncompleteOnly
              ? `Task belum selesai — ${workspace.outletName ?? "Outlet"}`
              : `Semua task — ${workspace.outletName ?? "Outlet"}`
            : `${outletTaskGroups.length} outlet · ${filteredAdminTasks.length} task`}
        </div>

        <div className="bg-[#F7FAF8] p-3 sm:p-4">
          <TaskGroupedList
            groups={activeTaskGroups}
            highlightedTaskId={highlightedTaskId}
            onOpenTask={handleOpenTask}
            formTemplates={formTemplates}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleTaskGroup}
            onExpandAll={expandAllTaskGroups}
            onCollapseAll={collapseAllTaskGroups}
            emptyMessage="Tidak ada task yang cocok dengan filter ini."
            pendingTaskIds={pendingTaskIds}
          />
        </div>
      </section>

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
          onEdit={isOwnerAdminWorkspace ? openEditTask : undefined}
          onDelete={
            isOwnerAdminWorkspace
              ? (task) => {
                  void deleteTask(task.id);
                }
              : undefined
          }
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
                progress: getTaskExecutionProgressPercentage(selectedTask, formTemplates),
                score: getTaskExecutionProgressPercentage(selectedTask, formTemplates),
                operator: "Outlet Operator",
                submittedAt: "Saved Draft",
              });
            }

            saveExecutionDraft();
          }}
          onSubmit={submitTaskExecution}
        />
      ) : null}

      <ChecklistSubmitResultModal
        open={Boolean(submitResult)}
        taskTitle={submitResult?.taskTitle ?? ""}
        checklist={submitResult?.checklist ?? null}
        pendingSync={submitResult?.pendingSync}
        onClose={closeSubmitResult}
      />
    </main>
  );
}

