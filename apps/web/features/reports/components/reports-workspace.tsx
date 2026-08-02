"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleAlert,
  Download,
} from "lucide-react";

import {
  BarChartCard,
  DonutChartCard,
  LineChartCard,
  PieChartCard,
} from "@/shared/analytics/charts";
import { queryKeys } from "@/lib/query/keys";
import { getExecutionSessions } from "@/services/execution-session.service";
import { formTemplateService } from "@/services/form-template.service";
import {
  formSubmissionService,
  type FormSubmissionResponse,
} from "@/services/form-submission.service";
import { taskService } from "@/services/task.service";
import {
  enrichTasksWithCompletedSessions,
  resolveTaskSubmissionSelection,
} from "@/features/history/utils/execution-session-history";
import type { Task } from "@/features/tasks/types";
import { isTaskCompleted, isTaskExpiredOverdue } from "@/features/tasks/utils/task-inbox";
import {
  countWorkedTasksForOutlet,
  exportOutletWorkReportPdf,
  filterWorkedTasksForOutlet,
  isTaskWorkedOn,
} from "@/features/reports/utils/task-work-report-pdf";
import { exportRegulatorReportPacketPdf } from "@/features/reports/utils/regulator-report-packet";
import { getReportSummary, getReportTrends } from "@/features/reports/reports-api";
import {
  HistoryDetailDrawer,
  type HistoryDetailSelection,
} from "@/features/history/components/history-detail-drawer";
import { RealtimeClock } from "@/shared/realtime";
import { downloadAuditBundle } from "@/services/reports.service";
import { useToast } from "@/shared/toast";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";

type ReportStatus = "completed" | "in_progress" | "pending" | "overdue";

type ReportRow = {
  id: string;
  outlet: string;
  task: string;
  form: string;
  status: ReportStatus;
  progress: number;
  score: number;
  operator: string;
  due: string;
  submittedAt: string;
};

type TrackingStatus = "done" | "overdue" | "open";

type TaskTrackingEntry = {
  id: string;
  dateKey: string;
  monthKey: string;
  dayLabel: string;
  dateLabel: string;
  shortDateLabel: string;
  task: string;
  outlet: string;
  assignee: string;
  priority: string;
  dueTime: string;
  status: TrackingStatus;
  completionTimestamp: string | null;
};

type DailyTrackingSummary = {
  dateKey: string;
  monthKey: string;
  dateLabel: string;
  shortDateLabel: string;
  dayLabel: string;
  total: number;
  done: number;
  overdue: number;
  open: number;
  rate: number;
};

type OutletTrackingGroup = {
  outlet: string;
  entries: TaskTrackingEntry[];
  total: number;
  done: number;
  overdue: number;
  open: number;
  rate: number;
};

function filterTasksForOutletAndDate(tasks: Task[], outlet: string, dateKey?: string) {
  const filtered = tasks.filter((task) => task.outlet === outlet);

  if (!dateKey) return filtered;

  return filtered.filter((task) => {
    const dueDate = getDueDate(task);
    return dueDate ? formatDateKey(dueDate) === dateKey : false;
  });
}

function isOverdue(task: Task) {
  if (isTaskExpiredOverdue(task)) return true;
  if (!task.due || task.status === "Completed") return false;

  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function getTaskProgress(task: Task) {
  if (isTaskExpiredOverdue(task)) return 0;
  if (isTaskCompleted(task) || task.execution?.completedAt) return 100;
  if (task.status === "In Progress") return 50;
  return 0;
}

function getReportStatus(task: Task): ReportStatus {
  if (isTaskExpiredOverdue(task)) return "overdue";
  if (isTaskCompleted(task) || task.execution?.completedAt) return "completed";
  if (isOverdue(task)) return "overdue";
  if (task.status === "In Progress") return "in_progress";
  return "pending";
}

function getStatusLabel(status: ReportStatus) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In Progress";
  if (status === "overdue") return "Overdue";
  return "Pending";
}

function getDateLabel(value: string) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toReportRow(task: Task): ReportRow {
  const progress = getTaskProgress(task);

  return {
    id: task.id,
    outlet: task.outlet,
    task: task.title,
    form: task.formTemplateId ?? "-",
    status: getReportStatus(task),
    progress,
    score: progress,
    operator: task.execution?.operatorName ?? task.assignee ?? "Outlet Team",
    due: getDateLabel(task.due),
    submittedAt: isTaskExpiredOverdue(task)
      ? "Not submitted"
      : isTaskWorkedOn(task)
        ? getDateLabel(task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due)
        : "-",
  };
}

function toManualSubmissionReportRow(
  submission: FormSubmissionResponse,
  templateName: string,
  outletName: string
): ReportRow {
  const score = Math.round(submission.score ?? 100);

  return {
    id: `manual-form-${submission.id}`,
    outlet: outletName,
    task: "Manual My Form submission",
    form: templateName,
    status: "completed",
    progress: 100,
    score,
    operator: submission.responsible_person_name ?? "Outlet Team",
    due: getDateLabel(submission.submitted_at ?? ""),
    submittedAt: getDateLabel(submission.submitted_at ?? ""),
  };
}

function getSummary(rows: ReportRow[]) {
  const completed = rows.filter((row) => row.status === "completed").length;
  const inProgress = rows.filter((row) => row.status === "in_progress").length;
  const overdue = rows.filter((row) => row.status === "overdue").length;
  const averageProgress =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length)
      : 0;
  const averageScore =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;

  return {
    total: rows.length,
    completed,
    inProgress,
    overdue,
    averageProgress,
    averageScore,
  };
}

function getStatusDistribution(rows: ReportRow[]) {
  const statusMap = new Map<string, number>();

  rows.forEach((row) => {
    const label = getStatusLabel(row.status);
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  });

  return Array.from(statusMap, ([name, value]) => ({ name, value }));
}

function getOutletPerformance(rows: ReportRow[]) {
  const outletMap = new Map<string, ReportRow[]>();

  rows.forEach((row) => {
    outletMap.set(row.outlet, [...(outletMap.get(row.outlet) ?? []), row]);
  });

  return Array.from(outletMap, ([outlet, outletRows]) => ({
    outlet,
    progress: Math.round(
      outletRows.reduce((sum, row) => sum + row.progress, 0) / Math.max(outletRows.length, 1)
    ),
    completed: outletRows.filter((row) => row.status === "completed").length,
  })).sort((first, second) => second.progress - first.progress);
}

function getFormBreakdown(rows: ReportRow[]) {
  const formMap = new Map<string, number>();

  rows.forEach((row) => {
    formMap.set(row.form, (formMap.get(row.form) ?? 0) + 1);
  });

  return Array.from(formMap, ([name, value]) => ({ name, value }));
}

function getCompletionTrend(rows: ReportRow[]) {
  const dayMap = new Map<string, ReportRow[]>();

  rows.forEach((row) => {
    const day = row.due === "No due date" ? "No due" : row.due.slice(0, 11).trim();
    dayMap.set(day, [...(dayMap.get(day) ?? []), row]);
  });

  return Array.from(dayMap, ([day, dayRows]) => ({
    day,
    completion: Math.round(
      (dayRows.filter((row) => row.status === "completed").length / Math.max(dayRows.length, 1)) *
        100
    ),
    submitted: dayRows.filter((row) => row.status === "completed").length,
  })).slice(0, 10);
}

function getDueDate(task: Task) {
  if (!task.due) return null;
  const date = new Date(task.due);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTrackingStatus(task: Task): TrackingStatus {
  if (isTaskExpiredOverdue(task)) return "overdue";
  if (isTaskWorkedOn(task)) return "done";
  if (isOverdue(task)) return "overdue";
  return "open";
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateKey(date: Date) {
  return `${formatMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildTrackingEntries(tasks: Task[]) {
  return tasks
    .map((task): TaskTrackingEntry | null => {
      const dueDate = getDueDate(task);
      if (!dueDate) return null;

      return {
        id: task.id,
        dateKey: formatDateKey(dueDate),
        monthKey: formatMonthKey(dueDate),
        dayLabel: dueDate.toLocaleDateString("en-US", { weekday: "short" }),
        dateLabel: dueDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        shortDateLabel: dueDate.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
        task: task.title,
        outlet: task.outlet,
        assignee: task.assignee,
        priority: task.priority,
        dueTime: dueDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: getTrackingStatus(task),
        completionTimestamp: task.execution?.completedAt ?? null,
      };
    })
    .filter((entry): entry is TaskTrackingEntry => Boolean(entry))
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey));
}

function getAvailableMonths(entries: TaskTrackingEntry[]) {
  const monthSet = new Set(entries.map((entry) => entry.monthKey));
  const currentMonthKey = formatMonthKey(new Date());
  monthSet.add(currentMonthKey);

  return Array.from(monthSet).sort((first, second) => second.localeCompare(first));
}

function buildDailySummaries(entries: TaskTrackingEntry[]) {
  const byDate = new Map<string, TaskTrackingEntry[]>();

  entries.forEach((entry) => {
    byDate.set(entry.dateKey, [...(byDate.get(entry.dateKey) ?? []), entry]);
  });

  return Array.from(byDate.entries())
    .map(([dateKey, rows]) => {
      const done = rows.filter((row) => row.status === "done").length;
      const overdue = rows.filter((row) => row.status === "overdue").length;
      const open = rows.filter((row) => row.status === "open").length;
      const total = rows.length;

      return {
        dateKey,
        monthKey: rows[0]?.monthKey ?? dateKey.slice(0, 7),
        dateLabel: rows[0]?.dateLabel ?? dateKey,
        shortDateLabel: rows[0]?.shortDateLabel ?? dateKey,
        dayLabel: rows[0]?.dayLabel ?? dateKey,
        total,
        done,
        overdue,
        open,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      } satisfies DailyTrackingSummary;
    })
    .sort((first, second) => first.dateKey.localeCompare(second.dateKey));
}

function getDailySummaryByMonth(summaries: DailyTrackingSummary[], monthKey: string) {
  return summaries.filter((summary) => summary.monthKey === monthKey);
}

function getTrackingStatusTone(status: TrackingStatus) {
  if (status === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "overdue") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getTrackingStatusLabel(status: TrackingStatus) {
  if (status === "done") return "Done";
  if (status === "overdue") return "Overdue";
  return "Open";
}

function getTrackingStatusIcon(status: TrackingStatus) {
  if (status === "done") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === "overdue") {
    return <CircleAlert className="h-4 w-4 text-red-600" />;
  }

  return <Circle className="h-4 w-4 text-sky-600" />;
}

function buildOutletTrackingGroups(entries: TaskTrackingEntry[]) {
  const outletMap = new Map<string, TaskTrackingEntry[]>();

  entries.forEach((entry) => {
    outletMap.set(entry.outlet, [...(outletMap.get(entry.outlet) ?? []), entry]);
  });

  return Array.from(outletMap.entries())
    .map(([outlet, outletEntries]) => {
      const done = outletEntries.filter((entry) => entry.status === "done").length;
      const overdue = outletEntries.filter((entry) => entry.status === "overdue").length;
      const open = outletEntries.filter((entry) => entry.status === "open").length;
      const total = outletEntries.length;

      return {
        outlet,
        entries: outletEntries.sort((first, second) => first.dueTime.localeCompare(second.dueTime)),
        total,
        done,
        overdue,
        open,
        rate: total > 0 ? Math.round((done / total) * 100) : 0,
      } satisfies OutletTrackingGroup;
    })
    .sort((first, second) => first.outlet.localeCompare(second.outlet));
}

export function ReportsWorkspace() {
  const toast = useToast();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isAreaWorkspace = workspace.mode === "area";
  const isOutletWorkspace = workspace.mode === "outlet";
  const isManagerWorkspace = !isOutletWorkspace;

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });
  const reportSummaryQuery = useQuery({
    queryKey: ["reports", "summary", workspace.outletId ?? workspace.mode],
    queryFn: getReportSummary,
    retry: false,
  });
  const reportTrendsQuery = useQuery({
    queryKey: ["reports", "trends", workspace.outletId ?? workspace.mode],
    queryFn: getReportTrends,
    retry: false,
  });
  const formTemplatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
  });
  const formSubmissionsQuery = useQuery({
    queryKey: ["form-submissions", "reports", workspace.outletId ?? workspace.mode],
    queryFn: () => formSubmissionService.list(),
    retry: false,
  });
  const executionSessionsQuery = useQuery({
    queryKey: queryKeys.history.executionSessions(),
    queryFn: () => getExecutionSessions({ status: "completed" }),
    retry: false,
  });

  const tasks = tasksQuery.data ?? [];
  const formTemplates = formTemplatesQuery.data ?? [];
  const formSubmissions = formSubmissionsQuery.data ?? [];
  const executionSessions = executionSessionsQuery.data ?? [];
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [periodAnchor] = useState(() => Date.now());

  const scopedTasks = useMemo(() => filterTasksForWorkspace(tasks, workspace), [tasks, workspace]);

  const enrichedScopedTasks = useMemo(
    () => enrichTasksWithCompletedSessions(scopedTasks, executionSessions),
    [scopedTasks, executionSessions]
  );

  const periodFilteredTasks = useMemo(() => {
    const cutoff = periodAnchor - periodDays * 24 * 60 * 60 * 1000;
    return enrichedScopedTasks.filter(isTaskWorkedOn).filter((task) => {
      const due = task.due ? new Date(task.due).getTime() : null;
      const completed = task.execution?.completedAt
        ? new Date(task.execution.completedAt).getTime()
        : null;
      const anchor = completed ?? due;
      if (anchor == null) return true;
      return anchor >= cutoff;
    });
  }, [enrichedScopedTasks, periodAnchor, periodDays]);

  const manualSubmissionRows = useMemo(() => {
    const cutoff = periodAnchor - periodDays * 24 * 60 * 60 * 1000;
    const templateNames = new Map(
      formTemplates.map((template) => [Number(template.id), template.name])
    );
    const outletNames = new Map(
      tasks.filter((task) => task.outletId).map((task) => [Number(task.outletId), task.outlet])
    );
    const selectedOutletId = workspace.outletId ? Number(workspace.outletId) : null;

    return formSubmissions
      .filter((submission) => {
        if (selectedOutletId !== null && submission.outlet_id !== selectedOutletId) return false;
        if (!submission.submitted_at) return true;
        return new Date(submission.submitted_at).getTime() >= cutoff;
      })
      .map((submission) =>
        toManualSubmissionReportRow(
          submission,
          templateNames.get(submission.form_template_id) ?? `Form #${submission.form_template_id}`,
          outletNames.get(submission.outlet_id) ?? `Outlet #${submission.outlet_id}`
        )
      );
  }, [formSubmissions, formTemplates, periodAnchor, periodDays, tasks, workspace.outletId]);
  const reportRows = useMemo(
    () => [...periodFilteredTasks.map(toReportRow), ...manualSubmissionRows],
    [manualSubmissionRows, periodFilteredTasks]
  );
  const clientSummary = useMemo(() => getSummary(reportRows), [reportRows]);
  const backendSummary = reportSummaryQuery.data;
  const complianceKpiValue = backendSummary?.compliance_rate ?? backendSummary?.audit_score ?? null;
  const complianceKpiLabel =
    backendSummary?.compliance_rate != null ? "Compliance Rate" : "Audit Score";
  const summary = {
    total: backendSummary?.total_items ?? clientSummary.total,
    completed: backendSummary?.completed_items ?? clientSummary.completed,
    inProgress: backendSummary?.open_tasks ?? clientSummary.inProgress,
    overdue: backendSummary?.overdue_tasks ?? clientSummary.overdue,
    averageProgress: backendSummary?.completion_rate ?? clientSummary.averageProgress,
    averageScore: backendSummary?.audit_score ?? clientSummary.averageScore,
  };
  const hasBackendSummary = reportSummaryQuery.isSuccess && Boolean(backendSummary);
  const outletNames = useMemo(
    () => Array.from(new Set(scopedTasks.map((task) => task.outlet).filter(Boolean))).sort(),
    [scopedTasks]
  );
  const completionTrend = useMemo(() => {
    const backendTrend = reportTrendsQuery.data;

    if (backendTrend && backendTrend.length > 0) {
      return backendTrend.map((point) => ({
        day: point.date,
        completion: point.compliance,
        submitted: point.completed,
      }));
    }

    return getCompletionTrend(reportRows);
  }, [reportRows, reportTrendsQuery.data]);
  const statusDistribution = useMemo(() => getStatusDistribution(reportRows), [reportRows]);
  const outletPerformance = useMemo(() => getOutletPerformance(reportRows), [reportRows]);
  const formBreakdown = useMemo(() => getFormBreakdown(reportRows), [reportRows]);
  const trackingEntries = useMemo(
    () => buildTrackingEntries(periodFilteredTasks),
    [periodFilteredTasks]
  );
  const availableMonths = useMemo(() => getAvailableMonths(trackingEntries), [trackingEntries]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => formatMonthKey(new Date()));
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const dailySummaries = useMemo(() => buildDailySummaries(trackingEntries), [trackingEntries]);
  const visibleMonthKey = availableMonths.includes(selectedMonthKey)
    ? selectedMonthKey
    : (availableMonths[0] ?? formatMonthKey(new Date()));
  const monthSummaries = useMemo(
    () => getDailySummaryByMonth(dailySummaries, visibleMonthKey),
    [dailySummaries, visibleMonthKey]
  );
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [collapsedOutletGroups, setCollapsedOutletGroups] = useState<Record<string, boolean>>({});
  const [historySelection, setHistorySelection] = useState<HistoryDetailSelection | null>(null);
  const taskById = useMemo(
    () => new Map(periodFilteredTasks.map((task) => [task.id, task])),
    [periodFilteredTasks]
  );
  const completedSessionsByTaskId = useMemo(() => {
    const map = new Map<string, (typeof executionSessions)[number]>();

    executionSessions.forEach((session) => {
      if (session.status !== "completed" || session.task_id == null) return;

      const taskId = String(session.task_id);
      const current = map.get(taskId);

      if (!current || session.id > current.id) {
        map.set(taskId, session);
      }
    });

    return map;
  }, [executionSessions]);
  const effectiveSelectedDateKey =
    monthSummaries.find((summaryItem) => summaryItem.dateKey === selectedDateKey)?.dateKey ??
    monthSummaries[0]?.dateKey ??
    "";
  const selectedDateSummary = monthSummaries.find(
    (summaryItem) => summaryItem.dateKey === effectiveSelectedDateKey
  );
  const selectedDateEntries = trackingEntries.filter(
    (entry) => entry.dateKey === effectiveSelectedDateKey
  );
  const outletTrackingGroups = useMemo(
    () => buildOutletTrackingGroups(selectedDateEntries),
    [selectedDateEntries]
  );

  function toggleOutletGroup(outlet: string) {
    const groupKey = `${effectiveSelectedDateKey}:${outlet}`;
    setCollapsedOutletGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  function isOutletGroupCollapsed(outlet: string) {
    const groupKey = `${effectiveSelectedDateKey}:${outlet}`;
    return collapsedOutletGroups[groupKey] ?? false;
  }

  function openTrackingDetail(entryId: string) {
    const task = taskById.get(entryId);
    if (!task || !isTaskWorkedOn(task)) return;

    setHistorySelection(resolveTaskSubmissionSelection(task, completedSessionsByTaskId));
  }

  async function handleOutletWorkExport(outlet: string, dateKey?: string, dateLabel?: string) {
    const scopedTasks = dateKey
      ? filterTasksForOutletAndDate(enrichedScopedTasks, outlet, dateKey).filter(isTaskWorkedOn)
      : filterWorkedTasksForOutlet(enrichedScopedTasks, outlet);

    try {
      setIsExportingPdf(true);
      await exportOutletWorkReportPdf({
        outlet,
        tasks: scopedTasks,
        templates: formTemplates,
        subtitle: dateLabel
          ? `${scopedTasks.length} task dikerjakan — ${dateLabel}`
          : `${scopedTasks.length} task dikerjakan`,
      });
      toast.success("Laporan hasil pekerjaan PDF berhasil diunduh.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat laporan PDF.";
      toast.error(message);
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleRegulatorPacketExport() {
    if (reportRows.length === 0) {
      toast.error("Belum ada data report untuk dibuat paket compliance.");
      return;
    }

    exportRegulatorReportPacketPdf({
      rows: reportRows,
      summary,
      periodLabel: `Last ${periodDays} days`,
      outletLabel: isOutletWorkspace
        ? workspace.outletName || "Current outlet"
        : "All scoped outlets",
    });
    toast.success("Compliance packet PDF berhasil diunduh.");
  }

  async function handleAuditBundleExport() {
    try {
      setIsExportingBundle(true);
      await downloadAuditBundle(periodDays);
      toast.success("Audit bundle ZIP berhasil diunduh.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat audit bundle.");
    } finally {
      setIsExportingBundle(false);
    }
  }

  if (isOutletWorkspace) {
    const completedHistory = periodFilteredTasks
      .filter(isTaskWorkedOn)
      .sort((left, right) => {
        const leftAt = left.execution?.completedAt ?? left.due ?? "";
        const rightAt = right.execution?.completedAt ?? right.due ?? "";
        return new Date(rightAt).getTime() - new Date(leftAt).getTime();
      });

    return (
      <main className={mobileDashboardMainClass}>
        <div>
          <p className="text-sm font-medium text-emerald-700">Laporan</p>
          <h1 className="text-2xl font-semibold text-slate-950">Riwayat Kerja</h1>
          <p className="mt-1 text-sm text-slate-500">
            Task yang sudah Anda selesaikan di {workspace.outletName ?? "outlet ini"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPeriodDays(7)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                periodDays === 7 ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              7 hari
            </button>
            <button
              type="button"
              onClick={() => setPeriodDays(30)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                periodDays === 30 ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              30 hari
            </button>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {completedHistory.length} selesai
          </span>
        </div>

        {completedHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Belum ada task selesai pada periode ini.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
            {completedHistory.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => openTrackingDetail(task.id)}
                  className="flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {getDateLabel(
                        task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    Selesai
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <HistoryDetailDrawer selection={historySelection} onClose={() => setHistorySelection(null)} />
      </main>
    );
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Reports</p>
          <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">Laporan Task Outlet</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {isAreaWorkspace
              ? "Lihat task yang sudah dikerjakan per outlet dan export laporan PDF beserta foto bukti."
              : "Riwayat task selesai per outlet dan export laporan hasil pekerjaan."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setPeriodDays(7)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                periodDays === 7 ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => setPeriodDays(30)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                periodDays === 30 ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Last 30 days
            </button>
          </div>
          <button
            type="button"
            onClick={() => void tasksQuery.refetch()}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleRegulatorPacketExport}
            disabled={reportRows.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download className="size-4" />
            Compliance Packet
          </button>
          <button
            type="button"
            onClick={() => void handleAuditBundleExport()}
            disabled={isExportingBundle}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Download className="size-4" />
            {isExportingBundle ? "Bundling..." : "Audit Bundle"}
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      {tasksQuery.isError || reportSummaryQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error
            ? tasksQuery.error.message
            : reportSummaryQuery.error instanceof Error
              ? reportSummaryQuery.error.message
              : "Unable to load reports."}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Ringkasan KPI
        </p>
        {hasBackendSummary ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Live
          </span>
        ) : null}
      </div>

      <div
        className={`grid grid-cols-2 gap-3 md:gap-4 ${
          complianceKpiValue != null ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-4"
        }`}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Tingkat Penyelesaian</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.averageProgress}%</p>
        </div>
        {complianceKpiValue != null ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <p className="text-sm text-emerald-700">{complianceKpiLabel}</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-800">{complianceKpiValue}%</p>
          </div>
        ) : null}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Task Selesai</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Task Terbuka</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">{summary.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{summary.overdue}</p>
        </div>
      </div>

      {isManagerWorkspace ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Export Laporan Hasil Pekerjaan (PDF)
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Unduh semua task yang sudah dikerjakan per outlet. Setiap task menampilkan raport
                checklist dan hasil pekerjaan operator.
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {outletNames.length} outlet
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {outletNames.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
                Belum ada data task untuk diexport.
              </div>
            ) : (
              outletNames.map((outlet) => {
                const workedCount = countWorkedTasksForOutlet(enrichedScopedTasks, outlet);

                return (
                  <div
                    key={outlet}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{outlet}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {workedCount} task sudah dikerjakan
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={workedCount === 0 || isExportingPdf}
                      onClick={() => void handleOutletWorkExport(outlet)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Download className="h-4 w-4" />
                      {isExportingPdf ? "Menyiapkan..." : "Export PDF"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <CalendarDays className="h-4 w-4 text-emerald-700" />
              Task Tracking by Date & Month
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Track which scheduled tasks were done, still open, or already overdue for each day in
              the selected month.
            </p>
          </div>

          <label className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <span className="font-semibold text-slate-700">Bulan</span>
            <select
              value={visibleMonthKey}
              onChange={(event) => {
                setSelectedMonthKey(event.target.value);
                setSelectedDateKey("");
              }}
              className="w-full bg-transparent font-semibold text-slate-900 outline-none sm:w-auto"
            >
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hari</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{monthSummaries.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Done</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">
              {monthSummaries.reduce((sum, day) => sum + day.done, 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Overdue</p>
            <p className="mt-2 text-2xl font-semibold text-red-700">
              {monthSummaries.reduce((sum, day) => sum + day.overdue, 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Open</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">
              {monthSummaries.reduce((sum, day) => sum + day.open, 0)}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Harian</p>
              <p className="text-xs text-slate-500">
                Pick a day to inspect the task list and completion pattern.
              </p>
            </div>
            {selectedDateSummary ? (
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Hari Terpilih
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedDateSummary.dateLabel}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 sm:hidden">
            {monthSummaries.map((day) => (
              <button
                key={`mobile-${day.dateKey}`}
                type="button"
                onClick={() => setSelectedDateKey(day.dateKey)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  effectiveSelectedDateKey === day.dateKey
                    ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {day.dayLabel}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-950">{day.dateLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{day.total} scheduled tasks</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {day.rate}%
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${day.rate}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold">
                  <span className="rounded-xl bg-emerald-100 px-2 py-1 text-emerald-700">
                    Done {day.done}
                  </span>
                  <span className="rounded-xl bg-red-100 px-2 py-1 text-red-700">
                    Late {day.overdue}
                  </span>
                  <span className="rounded-xl bg-sky-100 px-2 py-1 text-sky-700">
                    Open {day.open}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden overflow-x-auto pb-1 sm:block">
            <div className="flex min-w-max gap-3">
              {monthSummaries.map((day) => (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(day.dateKey)}
                  className={[
                    "min-w-[128px] rounded-2xl border px-4 py-3 text-left transition",
                    effectiveSelectedDateKey === day.dateKey
                      ? "border-emerald-600 bg-white shadow-sm ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {day.dayLabel}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{day.shortDateLabel}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${day.rate}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px] font-semibold">
                    <span className="rounded-xl bg-emerald-100 px-2 py-1 text-emerald-700">
                      {day.done}
                    </span>
                    <span className="rounded-xl bg-red-100 px-2 py-1 text-red-700">
                      {day.overdue}
                    </span>
                    <span className="rounded-xl bg-sky-100 px-2 py-1 text-sky-700">{day.open}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-500">
                    {day.total} scheduled
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-[#F7FAF8] p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {selectedDateSummary?.dateLabel ?? "No schedule yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Daily task tracking for the selected date.
                </p>
              </div>
              {selectedDateSummary ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {selectedDateSummary.rate}% done
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {selectedDateEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No scheduled tasks for this date yet.
                </div>
              ) : isOutletWorkspace ? (
                selectedDateEntries.map((entry) => {
                  const isClickable = entry.status === "done";

                  return (
                    <article
                      key={`${entry.id}-${entry.dateKey}`}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={isClickable ? () => openTrackingDetail(entry.id) : undefined}
                      onKeyDown={
                        isClickable
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openTrackingDetail(entry.id);
                              }
                            }
                          : undefined
                      }
                      className={`rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4 ${
                        isClickable
                          ? "cursor-pointer transition hover:border-emerald-300 hover:shadow-md"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="min-w-[68px] rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-center sm:min-w-[72px] sm:px-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Due
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {entry.dueTime}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {getTrackingStatusIcon(entry.status)}
                              <p className="font-semibold text-slate-900 break-words">
                                {entry.task}
                              </p>
                            </div>
                            {!isOutletWorkspace ? (
                              <p className="mt-1 text-sm text-slate-500">{entry.outlet}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                {entry.assignee}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                {entry.priority}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTrackingStatusTone(
                            entry.status
                          )}`}
                        >
                          {getTrackingStatusLabel(entry.status)}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                        <p className="font-semibold uppercase tracking-wide text-slate-400">
                          Completion
                        </p>
                        <p className="mt-1 text-sm text-slate-800">
                          {entry.completionTimestamp
                            ? getDateLabel(entry.completionTimestamp)
                            : "Not submitted yet"}
                        </p>
                      </div>
                    </article>
                  );
                })
              ) : (
                outletTrackingGroups.map((group) => {
                  const isCollapsed = isOutletGroupCollapsed(group.outlet);

                  return (
                    <section
                      key={`${effectiveSelectedDateKey}-${group.outlet}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-stretch gap-2 px-3 py-3 sm:px-4">
                        <button
                          type="button"
                          onClick={() => toggleOutletGroup(group.outlet)}
                          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950">{group.outlet}</p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {group.total} tasks
                              </span>
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                {group.done}
                              </span>
                              <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700">
                                {group.overdue}
                              </span>
                              <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-700">
                                {group.open}
                              </span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${group.rate}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            {isCollapsed ? "Tampilkan" : "Sembunyikan"}
                            {isCollapsed ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          disabled={
                            isExportingPdf ||
                            filterTasksForOutletAndDate(
                              enrichedScopedTasks,
                              group.outlet,
                              effectiveSelectedDateKey
                            ).filter(isTaskWorkedOn).length === 0
                          }
                          onClick={() =>
                            void handleOutletWorkExport(
                              group.outlet,
                              effectiveSelectedDateKey,
                              selectedDateSummary?.dateLabel
                            )
                          }
                          className="inline-flex shrink-0 items-center gap-2 self-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                          title={`Export laporan pekerjaan — ${group.outlet}`}
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            {isExportingPdf ? "Menyiapkan..." : "Export PDF"}
                          </span>
                        </button>
                      </div>

                      {!isCollapsed ? (
                        <div className="border-t border-slate-100 bg-[#F7FAF8] p-3 sm:p-4">
                          <div className="space-y-3">
                            {group.entries.map((entry) => {
                              const isClickable = entry.status === "done";

                              return (
                                <article
                                  key={`${entry.id}-${entry.dateKey}`}
                                  role={isClickable ? "button" : undefined}
                                  tabIndex={isClickable ? 0 : undefined}
                                  onClick={
                                    isClickable ? () => openTrackingDetail(entry.id) : undefined
                                  }
                                  onKeyDown={
                                    isClickable
                                      ? (event) => {
                                          if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            openTrackingDetail(entry.id);
                                          }
                                        }
                                      : undefined
                                  }
                                  className={`rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4 ${
                                    isClickable
                                      ? "cursor-pointer transition hover:border-emerald-300 hover:shadow-md"
                                      : ""
                                  }`}
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-3">
                                      <div className="min-w-[68px] rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-center sm:min-w-[72px] sm:px-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                          Due
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-900">
                                          {entry.dueTime}
                                        </p>
                                      </div>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          {getTrackingStatusIcon(entry.status)}
                                          <p className="font-semibold text-slate-900">
                                            {entry.task}
                                          </p>
                                        </div>
                                        <p className="mt-1 text-sm text-slate-500">
                                          {entry.outlet}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                            {entry.assignee}
                                          </span>
                                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                            {entry.priority}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTrackingStatusTone(
                                        entry.status
                                      )}`}
                                    >
                                      {getTrackingStatusLabel(entry.status)}
                                    </span>
                                  </div>

                                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                                    <p className="font-semibold uppercase tracking-wide text-slate-400">
                                      Completion
                                    </p>
                                    <p className="mt-1 text-sm text-slate-800">
                                      {entry.completionTimestamp
                                        ? getDateLabel(entry.completionTimestamp)
                                        : "Not submitted yet"}
                                    </p>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </section>
                  );
                })
              )}
            </div>
          </section>

          <section className="hidden min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:block">
            <p className="text-sm font-semibold text-slate-950">Rekap Bulanan</p>
            <p className="mt-1 text-xs text-slate-500">
              Daily summary of done vs overdue vs open tasks for {formatMonthLabel(visibleMonthKey)}
              .
            </p>

            <div className="mt-4 space-y-3">
              {monthSummaries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No scheduled task dates in this month.
                </div>
              ) : (
                monthSummaries.map((day) => (
                  <button
                    key={`summary-${day.dateKey}`}
                    type="button"
                    onClick={() => setSelectedDateKey(day.dateKey)}
                    className={[
                      "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      effectiveSelectedDateKey === day.dateKey
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{day.dateLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">{day.total} scheduled tasks</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${day.rate}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        {day.done}
                      </span>
                      <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
                        {day.overdue}
                      </span>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">
                        {day.open}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      {isOutletWorkspace ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Progres Semua Outlet</p>
                <p className="text-xs text-slate-500">Progress task outlet Anda.</p>
              </div>
              <p className="text-sm font-bold text-emerald-700">{summary.averageProgress}%</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-700 transition-all duration-700"
                style={{ width: `${summary.averageProgress}%` }}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LineChartCard
              title="Task Completion Trend"
              description="Completion percentage and completed task count by due date."
              data={completionTrend}
              xKey="day"
              series={[
                { dataKey: "completion", name: "Completion %" },
                { dataKey: "submitted", name: "Completed" },
              ]}
            />
            <DonutChartCard
              title="Task Status Distribution"
              description="Status task saat ini."
              data={statusDistribution}
              valueKey="value"
              nameKey="name"
            />
            <div className="hidden md:block">
              <BarChartCard
                title="Outlet Progress"
                description="Rata-rata progress task per outlet."
                data={outletPerformance}
                xKey="outlet"
                series={[{ dataKey: "progress", name: "Progress %" }]}
              />
            </div>
            <div className="hidden md:block">
              <PieChartCard
                title="Form Template Breakdown"
                description="Distribusi task berdasarkan form template."
                data={formBreakdown}
                valueKey="value"
                nameKey="name"
              />
            </div>
          </div>
        </>
      ) : null}

      <HistoryDetailDrawer selection={historySelection} onClose={() => setHistorySelection(null)} />
    </main>
  );
}
