"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Lock, Search } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { FieldTaskCard } from "@/features/tasks/components/FieldTaskCard";
import { PushNotificationPrompt } from "@/features/notifications/components/push-notification-prompt";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { ChecklistSubmitResultModal,
  OutletTaskExecutionDrawer,
  TaskDetailDrawer,
  TaskFormDrawer,
} from "@/features/tasks/components";
import { TaskWeekCalendarStrip } from "@/features/tasks/components/task-week-calendar-strip";
import type { FormTemplate } from "@/features/forms/types";
import { useTaskWorkspace } from "@/features/tasks/hooks/use-task-workspace";
import { Task } from "@/features/tasks/types";
import { formatTaskSchedule } from "@/features/tasks/utils";
import { queryKeys } from "@/lib/query/keys";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";
import { formTemplateService } from "@/services/form-template.service";
import {
  taskScheduleService,
  type BackendUpcomingTaskSchedule,
} from "@/services/task-schedule.service";
import { calculateFormProgress, ProgressChip } from "@/shared/form-progress";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { isOpenTaskInInbox, isTaskCompleted } from "@/features/tasks/utils/task-inbox";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { OfflineSyncBadge } from "@/shared/navigation/components/offline-sync-badge";
import {
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

function getDefaultSectionCollapsed(sectionId: string, taskCount: number, isOutletRole = false) {
  if (isOutletRole) {
    if (sectionId === "completed") {
      return taskCount > 8;
    }

    return false;
  }

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
  if (isTaskCompleted(task)) return 100;

  const draftProgress = getTaskDraftProgress(task, templates);

  if (draftProgress) return draftProgress.percentage;

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

function formatUpcomingPublish(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapUpcomingSchedule(item: BackendUpcomingTaskSchedule): Task {
  const priority =
    item.priority === "urgent"
      ? "Critical"
      : item.priority === "high"
        ? "High"
        : item.priority === "low"
          ? "Low"
          : "Medium";
  const publishLabel = formatUpcomingPublish(item.publish_at);

  return {
    id: item.id,
    title: item.shift ? `${item.title} (${item.shift})` : item.title,
    outlet: `Outlet ${item.outlet_id}`,
    outletId: String(item.outlet_id),
    status: "Pending",
    priority,
    assignee: "Outlet Team",
    due: item.publish_at,
    description: item.description ?? "",
    formTemplateId: item.form_template_id ? String(item.form_template_id) : undefined,
    recurrence: item.recurrence,
    shifts: item.shift ? [item.shift] : [],
    targetOutlets: [`Outlet ${item.outlet_id}`],
    targetOutletIds: [String(item.outlet_id)],
    autoPublish: true,
    dueTime: publishLabel,
    isUpcoming: true,
    publishAt: item.publish_at,
    lockedReason: `Bisa dikerjakan setelah publish ${publishLabel}`,
  };
}

function getMobileSections(tasks: Task[]) {
  const now = new Date();
  const weekEnd = getWeekEnd(now);

  const upcoming = tasks.filter((task) => task.isUpcoming);
  const eligibleTasks = tasks.filter((task) => !task.isUpcoming && isOpenTaskInInbox(task));

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];

  eligibleTasks.forEach((task) => {
    const dueDate = parseTaskDueDate(task);

    if (!dueDate) {
      later.push(task);
      return;
    }

    if (dueDate < now) {
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

  return [
    { id: "upcoming", title: "Upcoming", tasks: upcoming },
    { id: "overdue", title: `${overdue.length} Overdue`, tasks: overdue },
    { id: "today", title: "Today", tasks: today },
    { id: "due-this-week", title: "Due This Week", tasks: thisWeek },
    { id: "later", title: "Later", tasks: later },
  ].filter((section) => section.tasks.length > 0);
}

function MobileTaskRow({
  task,
  highlighted,
  onOpen,
  formTemplates,
  isPendingSync,
  isFailedSync,
}: {
  task: Task;
  highlighted: boolean;
  onOpen: () => void;
  formTemplates: FormTemplate[];
  isPendingSync?: boolean;
  isFailedSync?: boolean;
}) {
  const progress = getTaskExecutionProgressPercentage(task, formTemplates);
  const draftProgress = getTaskDraftProgress(task, formTemplates);
  const isUpcoming = Boolean(task.isUpcoming);
  const isOverdue = (() => {
    if (isUpcoming) return false;
    const dueDate = parseTaskDueDate(task);
    return dueDate ? dueDate < new Date() && progress < 100 : false;
  })();

  const status = (() => {
    if (isTaskCompleted(task)) return 'completed';
    if (task.executionDraft) return 'in_progress';
    if (isUpcoming) return 'blocked';
    return 'open';
  })();

  const priority = (task.priority?.toLowerCase() === 'high' ? 'high' : 'medium') as 'low' | 'medium' | 'high';

  return (
    <div className={`px-3 py-2 ${highlighted ? "bg-emerald-50" : "bg-white"}`}>
      <FieldTaskCard
        taskId={task.id}
        title={task.title}
        description={task.description?.trim()}
        status={status}
        dueTime={formatMobileTime(task)}
        priority={priority}
        onClick={onOpen}
        progress={progress}
        draftProgress={draftProgress?.percentage}
        isUpcoming={isUpcoming}
        isOverdue={isOverdue}
        isPendingSync={isPendingSync}
        isFailedSync={isFailedSync}
        formTemplateName={task.formTemplateName}
        checklistCount={task.checklistFieldCount}
        checklistPreview={task.checklistPreview}
        lockedReason={task.lockedReason}
        isFollowUp={task.priority?.toLowerCase() === "high"}
      />
    </div>
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
  failedTaskIds,
}: {
  section: MobileTaskSection;
  highlightedTaskId: string | null;
  onOpenTask: (task: Task) => void;
  formTemplates: FormTemplate[];
  collapsed: boolean;
  onToggle: () => void;
  pendingTaskIds: Set<string>;
  failedTaskIds: Set<string>;
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
              highlighted={task.id === highlightedTaskId}
              onOpen={() => onOpenTask(task)}
              formTemplates={formTemplates}
              isPendingSync={pendingTaskIds.has(task.id)}
              isFailedSync={failedTaskIds.has(task.id)}
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
  failedTaskIds,
  isOutletRole = false,
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
  failedTaskIds: Set<string>;
  isOutletRole?: boolean;
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
      {!isOutletRole && groups.length > 1 ? (
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

      {isOutletRole
        ? groups.map((section) => (
            <div key={section.id} className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {section.title}
                <span className="ml-2 tabular-nums text-slate-400">{section.tasks.length}</span>
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {section.tasks.map((task) => (
                  <MobileTaskRow
                    key={task.id}
                    task={task}
                    highlighted={highlightedTaskId === task.id}
                    onOpen={() => onOpenTask(task)}
                    formTemplates={formTemplates}
                    isPendingSync={pendingTaskIds.has(task.id)}
                    isFailedSync={failedTaskIds.has(task.id)}
                  />
                ))}
              </div>
            </div>
          ))
        : groups.map((section) => {
            const defaultCollapsed = getDefaultSectionCollapsed(
              section.id,
              section.tasks.length,
              isOutletRole
            );
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
                failedTaskIds={failedTaskIds}
              />
            );
          })}
    </div>
  );
}

export function TasksWorkspace() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const capaEnabled = isCapaEnabled(settings);
  const continuedDraftRef = useRef<string | null>(null);
  const handledTaskIdRef = useRef<string | null>(null);
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [mobileSearch, setMobileSearch] = useState("");
  const [calendarView, setCalendarView] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date());
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
    saveExecutionDraft,
    submitTaskExecution,
    submitResult,
    closeSubmitResult,
    isBackendConnected,
    isOnline,
    pendingLocalSyncCount,
  } = useTaskWorkspace();
  const { pendingTaskIds, failedTaskIds } = useOfflineSync();

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

  const upcomingSchedulesQuery = useQuery({
    queryKey: ["task-schedules", "upcoming", workspace.mode, workspace.outletId],
    queryFn: () => taskScheduleService.listUpcoming(),
    enabled: isOutletWorkspace || isAreaWorkspace,
    retry: false,
  });
  const upcomingTasks = useMemo(
    () => (upcomingSchedulesQuery.data ?? []).map(mapUpcomingSchedule),
    [upcomingSchedulesQuery.data]
  );

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

  function clearTaskDeepLinkParams(...keys: Array<"taskId" | "continueDraft">) {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    keys.forEach((key) => {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    });

    if (!changed) return;

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleCloseExecution() {
    closeExecution();
    clearTaskDeepLinkParams("taskId", "continueDraft");
    handledTaskIdRef.current = null;
    continuedDraftRef.current = null;
  }

  function handleCloseDetail() {
    closeDetail();
    clearTaskDeepLinkParams("taskId");
    handledTaskIdRef.current = null;
  }

  useEffect(() => {
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      handledTaskIdRef.current = null;
      return;
    }

    if (tasks.length === 0) return;
    if (handledTaskIdRef.current === taskId) return;

    const matchedTask = tasks.find((task) => task.id === taskId);
    if (!matchedTask) return;

    handledTaskIdRef.current = taskId;
    setHighlightedTaskId(taskId);

    const openTimer = window.setTimeout(() => {
      if (isOutletRole) {
        openExecution(matchedTask);
      } else {
        openTaskDetail(matchedTask);
      }
    }, 300);

    const highlightTimer = window.setTimeout(() => {
      setHighlightedTaskId(null);
    }, 3500);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [isOutletRole, openExecution, openTaskDetail, searchParams, tasks]);

  const outletScopedTasks = useMemo(() => {
    if (!isOutletWorkspace) return tasks;

    return filterTasksForWorkspace(tasks, workspace);
  }, [isOutletWorkspace, tasks, workspace]);

  const workspaceTasks = useMemo(
    () => (isOutletWorkspace || isAreaWorkspace ? [...upcomingTasks, ...outletScopedTasks] : outletScopedTasks),
    [isAreaWorkspace, isOutletWorkspace, outletScopedTasks, upcomingTasks]
  );

  const openTasks = useMemo(
    () => workspaceTasks.filter((task) => task.isUpcoming || isOpenTaskInInbox(task)),
    [workspaceTasks]
  );

  const visibleTasks = useMemo(() => {
    return [...openTasks].sort((left, right) => {
      const leftDraftWeight = left.executionDraft ? 1 : 0;
      const rightDraftWeight = right.executionDraft ? 1 : 0;

      if (leftDraftWeight !== rightDraftWeight) {
        return rightDraftWeight - leftDraftWeight;
      }

      return left.title.localeCompare(right.title);
    });
  }, [openTasks]);

  const taskCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    visibleTasks.forEach((task) => {
      const dueDate = parseTaskDueDate(task);
      if (!dueDate) return;
      const key = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [visibleTasks]);

  const calendarFilteredTasks = useMemo(() => {
    if (!calendarView) return visibleTasks;
    const key = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, "0")}-${String(selectedCalendarDate.getDate()).padStart(2, "0")}`;
    return visibleTasks.filter((task) => {
      const dueDate = parseTaskDueDate(task);
      if (!dueDate) return false;
      const taskKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
      return taskKey === key;
    });
  }, [calendarView, selectedCalendarDate, visibleTasks]);

  const filteredMobileTasks = useMemo(() => {
    const query = mobileSearch.trim().toLowerCase();
    const baseTasks = calendarView ? calendarFilteredTasks : visibleTasks;

    if (!query) return baseTasks;

    return baseTasks.filter((task) => {
      const haystack = [task.title, task.outlet, task.formTemplateId ?? "", task.status]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [mobileSearch, visibleTasks, calendarView, calendarFilteredTasks]);

  const mobileSections = useMemo(
    () => getMobileSections(filteredMobileTasks),
    [filteredMobileTasks]
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
    if (task.isUpcoming) {
      setHighlightedTaskId(task.id);
      window.setTimeout(() => {
        setHighlightedTaskId(null);
      }, 2500);
      return;
    }

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
    <main className={mobileDashboardMainClass}>
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
            {isOutletWorkspace ? <OfflineSyncBadge /> : (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:px-4">
                <span className="hidden text-xs font-semibold uppercase tracking-wide text-slate-400 sm:inline">
                  {t("tasks.realtime")}
                </span>
                <RealtimeClock />
              </div>
            )}
            <span
              className={`inline-flex items-center rounded-2xl px-3 py-2 text-xs font-bold sm:px-4 ${
                isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {isOnline ? t("tasks.online") : t("tasks.offline")}
            </span>
            {!isOutletWorkspace ? (
              <span
                className={`inline-flex items-center rounded-2xl px-4 py-2 text-xs font-bold ${
                  isBackendConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {isBackendConnected ? t("tasks.backendSynced") : t("tasks.backendUnavailable")}
              </span>
            ) : null}
            {pendingLocalSyncCount > 0 ? (
              <span className="inline-flex items-center rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 sm:px-4">
                {t("tasks.pendingSync").replace("{count}", String(pendingLocalSyncCount))}
              </span>
            ) : null}
          </div>
        </div>

        {!isOutletWorkspace ? (
          <div className="flex flex-wrap items-center gap-2">
            {canCreateTask ? (
              <button
                type="button"
                onClick={openCreateTask}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
              >
                {t("tasks.createTask")}
              </button>
            ) : null}
            {canCreateTask ? (
              <Link
                href="/dashboard/schedules"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {t("tasks.manageSchedules")}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOutletWorkspace ? <PushNotificationPrompt /> : null}

      {!isOutletWorkspace ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCalendarView((current) => !current)}
            className={`rounded-2xl px-4 py-2 text-xs font-bold ${
              calendarView
                ? "bg-emerald-700 text-white"
                : "border border-slate-200 bg-white text-slate-700"
            }`}
          >
            {calendarView ? t("tasks.listView") : t("tasks.weekView")}
          </button>
        </div>
      ) : null}

      {!isOutletWorkspace && calendarView ? (
        <TaskWeekCalendarStrip
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          taskCountByDate={taskCountByDate}
        />
      ) : null}

      {!isOutletWorkspace ? (
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
      ) : null}

      <section className={`overflow-hidden ${isOutletWorkspace ? "" : "rounded-2xl border border-slate-200 bg-white shadow-sm"}`}>
        <div className={`${isOutletWorkspace ? "pb-2" : "border-b border-slate-200 px-3 py-3 sm:px-4"}`}>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={mobileSearch}
              onChange={(event) => setMobileSearch(event.target.value)}
              placeholder={isOutletWorkspace ? "Cari task..." : "Cari task, outlet, atau status"}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {!isOutletWorkspace ? (
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:px-4">
            {`${outletTaskGroups.length} outlet · ${filteredAdminTasks.length} task aktif`}
          </div>
        ) : null}

        <div className={isOutletWorkspace ? "pt-2" : "bg-[#F7FAF8] p-3 sm:p-4"}>
          <TaskGroupedList
            groups={activeTaskGroups}
            highlightedTaskId={highlightedTaskId}
            onOpenTask={handleOpenTask}
            formTemplates={formTemplates}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleTaskGroup}
            onExpandAll={expandAllTaskGroups}
            onCollapseAll={collapseAllTaskGroups}
            emptyMessage="Semua task sudah selesai. Lihat hasil pekerjaan di menu Reports."
            pendingTaskIds={pendingTaskIds}
            failedTaskIds={failedTaskIds}
            isOutletRole={isOutletRole}
          />
        </div>
      </section>

      {canCreateTask ? (
        <TaskFormDrawer
          open={isFormOpen}
          mode={isEditingTask ? "edit" : "create"}
          variant="task"
          form={taskForm}
          onClose={closeTaskForm}
          onChange={setTaskForm}
          onSubmit={submitTaskForm}
        />
      ) : null}

      {!isOutletRole ? (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={handleCloseDetail}
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
          onClose={handleCloseExecution}
          onChange={setExecutionForm}
          onCancel={handleCloseExecution}
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
        isSyncing={submitResult?.isSyncing}
        correctiveActionId={submitResult?.correctiveActionId}
        capaEnabled={capaEnabled}
        onClose={closeSubmitResult}
      />
    </main>
  );
}
