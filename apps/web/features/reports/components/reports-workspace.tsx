"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleAlert,
  Clock3,
} from "lucide-react";

import {
  BarChartCard,
  DonutChartCard,
  LineChartCard,
  PieChartCard,
} from "@/shared/analytics/charts";
import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import {
  EnterpriseFilterDefinition,
  EnterpriseFilterState,
  applyEnterpriseFilters,
} from "@/shared/filters";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";
import { RealtimeClock } from "@/shared/realtime";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { EnterpriseToolbar } from "@/shared/toolbar";

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

const initialReportFilters: EnterpriseFilterState = {
  outlet: "",
  form: "",
  status: "",
};

function isOverdue(task: Task) {
  if (!task.due || task.status === "Completed") return false;

  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function getTaskProgress(task: Task) {
  if (task.status === "Completed") return 100;
  if (task.status === "In Progress") return 50;
  return 0;
}

function getReportStatus(task: Task): ReportStatus {
  if (task.status === "Completed") return "completed";
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
    submittedAt:
      task.status === "Completed"
        ? getDateLabel(task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due)
        : "-",
  };
}

function getSummary(rows: ReportRow[]) {
  const completed = rows.filter((row) => row.status === "completed").length;
  const inProgress = rows.filter((row) => row.status === "in_progress").length;
  const overdue = rows.filter((row) => row.status === "overdue").length;
  const averageProgress =
    rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0;
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
  if (task.status === "Completed" || task.execution) return "done";
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

const reportColumns: EnterpriseColumn<ReportRow>[] = [
  { key: "id", header: "Report ID", sortable: true, hideable: true },
  { key: "outlet", header: "Outlet", sortable: true },
  { key: "task", header: "Task", sortable: true },
  { key: "form", header: "Form", sortable: true, hideable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    hideable: true,
    render: (report) => {
      const statusClass =
        report.status === "completed"
          ? "bg-emerald-50 text-emerald-700"
          : report.status === "in_progress"
            ? "bg-blue-50 text-blue-700"
            : report.status === "overdue"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700";

      return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {getStatusLabel(report.status)}
        </span>
      );
    },
  },
  {
    key: "progress",
    header: "Progress",
    sortable: true,
    hideable: true,
    render: (report) => `${report.progress}%`,
  },
  {
    key: "score",
    header: "Score",
    sortable: true,
    hideable: true,
    render: (report) => `${report.score}%`,
  },
  { key: "operator", header: "Operator", sortable: true, hideable: true },
  { key: "due", header: "Due", sortable: true, hideable: true },
  { key: "submittedAt", header: "Submitted At", sortable: true, hideable: true },
];

export function ReportsWorkspace() {
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isAreaWorkspace = workspace.mode === "area";

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.list,
    retry: false,
  });
  const [filters, setFilters] = useState<EnterpriseFilterState>(initialReportFilters);
  const [toolbarSearch, setToolbarSearch] = useState("");

  const reportRows = useMemo(() => (tasksQuery.data ?? []).map(toReportRow), [tasksQuery.data]);
  const summary = useMemo(() => getSummary(reportRows), [reportRows]);
  const completionTrend = useMemo(() => getCompletionTrend(reportRows), [reportRows]);
  const statusDistribution = useMemo(() => getStatusDistribution(reportRows), [reportRows]);
  const outletPerformance = useMemo(() => getOutletPerformance(reportRows), [reportRows]);
  const formBreakdown = useMemo(() => getFormBreakdown(reportRows), [reportRows]);
  const trackingEntries = useMemo(() => buildTrackingEntries(tasksQuery.data ?? []), [tasksQuery.data]);
  const availableMonths = useMemo(() => getAvailableMonths(trackingEntries), [trackingEntries]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => formatMonthKey(new Date()));
  const dailySummaries = useMemo(() => buildDailySummaries(trackingEntries), [trackingEntries]);
  const visibleMonthKey = availableMonths.includes(selectedMonthKey)
    ? selectedMonthKey
    : availableMonths[0] ?? formatMonthKey(new Date());
  const monthSummaries = useMemo(
    () => getDailySummaryByMonth(dailySummaries, visibleMonthKey),
    [dailySummaries, visibleMonthKey]
  );
  const [selectedDateKey, setSelectedDateKey] = useState("");
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

  const reportFilterDefinitions: EnterpriseFilterDefinition[] = useMemo(() => {
    const outlets = Array.from(new Set(reportRows.map((report) => report.outlet)));
    const forms = Array.from(new Set(reportRows.map((report) => report.form)));

    return [
      {
        key: "outlet",
        label: "Outlet",
        type: "select",
        placeholder: "All outlets",
        options: outlets.map((outlet) => ({ label: outlet, value: outlet })),
      },
      {
        key: "form",
        label: "Form",
        type: "select",
        placeholder: "All forms",
        options: forms.map((form) => ({ label: form, value: form })),
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        placeholder: "All status",
        options: [
          { label: "Completed", value: "completed" },
          { label: "In Progress", value: "in_progress" },
          { label: "Pending", value: "pending" },
          { label: "Overdue", value: "overdue" },
        ],
      },
    ];
  }, [reportRows]);

  const searchedReports = useMemo(() => {
    if (!toolbarSearch.trim()) return reportRows;

    const query = toolbarSearch.toLowerCase();
    return reportRows.filter((report) =>
      Object.values(report).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [reportRows, toolbarSearch]);

  const filteredReports = useMemo(
    () => applyEnterpriseFilters(searchedReports, filters, reportFilterDefinitions),
    [searchedReports, filters, reportFilterDefinitions]
  );

  function resetReports() {
    setToolbarSearch("");
    setFilters(initialReportFilters);
  }

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Reports</p>
          <h1 className="text-2xl font-semibold text-slate-950">Outlet Task Reports</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {isAreaWorkspace
              ? "Area manager dapat memantau performa task outlet dari laporan backend tanpa mengubah data sumber."
              : "Live reporting from backend tasks synced across owner, area manager, and outlet accounts."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetReports();
              void tasksQuery.refetch();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      {tasksQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load reports."}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completion Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.averageProgress}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completed Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">In Progress</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">{summary.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{summary.overdue}</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <CalendarDays className="h-4 w-4 text-emerald-700" />
              Task Tracking by Date & Month
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Track which scheduled tasks were done, still open, or already overdue for each day in the selected month.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Month</span>
            <select
              value={visibleMonthKey}
              onChange={(event) => {
                setSelectedMonthKey(event.target.value);
                setSelectedDateKey("");
              }}
              className="bg-transparent font-semibold text-slate-900 outline-none"
            >
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Month Days</p>
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
              <p className="text-sm font-semibold text-slate-950">Daily</p>
              <p className="text-xs text-slate-500">
                Pick a day to inspect the task list and completion pattern.
              </p>
            </div>
            {selectedDateSummary ? (
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Selected Day</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedDateSummary.dateLabel}</p>
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
                  <span className="rounded-xl bg-emerald-100 px-2 py-1 text-emerald-700">Done {day.done}</span>
                  <span className="rounded-xl bg-red-100 px-2 py-1 text-red-700">Late {day.overdue}</span>
                  <span className="rounded-xl bg-sky-100 px-2 py-1 text-sky-700">Open {day.open}</span>
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
                    <span className="rounded-xl bg-emerald-100 px-2 py-1 text-emerald-700">{day.done}</span>
                    <span className="rounded-xl bg-red-100 px-2 py-1 text-red-700">{day.overdue}</span>
                    <span className="rounded-xl bg-sky-100 px-2 py-1 text-sky-700">{day.open}</span>
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-slate-500">{day.total} scheduled</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="rounded-2xl border border-slate-200 bg-[#F7FAF8] p-3 sm:p-4">
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
              ) : (
                selectedDateEntries.map((entry) => (
                  <article
                    key={`${entry.id}-${entry.dateKey}`}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="min-w-[68px] rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-center sm:min-w-[72px] sm:px-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Due</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{entry.dueTime}</p>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {getTrackingStatusIcon(entry.status)}
                            <p className="font-semibold text-slate-900">{entry.task}</p>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{entry.outlet}</p>
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

                    <div className="mt-4 grid gap-3 text-xs text-slate-600 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="font-semibold uppercase tracking-wide text-slate-400">Completion</p>
                        <p className="mt-1 text-sm text-slate-800">
                          {entry.completionTimestamp ? getDateLabel(entry.completionTimestamp) : "Not submitted yet"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="font-semibold uppercase tracking-wide text-slate-400">Action</p>
                        <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                          Review task flow
                          <ChevronRight className="h-4 w-4" />
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">Monthly Register</p>
            <p className="mt-1 text-xs text-slate-500">
              Daily summary of done vs overdue vs open tasks for {formatMonthLabel(visibleMonthKey)}.
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
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{day.done}</span>
                      <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">{day.overdue}</span>
                      <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">{day.open}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">All Outlet Progress</p>
            <p className="text-xs text-slate-500">Calculated from backend task status.</p>
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

      <div className="grid gap-4 xl:grid-cols-2">
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
          description="Current backend task lifecycle status."
          data={statusDistribution}
          valueKey="value"
          nameKey="name"
        />
        <BarChartCard
          title="Outlet Progress"
          description="Average backend task progress per outlet."
          data={outletPerformance}
          xKey="outlet"
          series={[{ dataKey: "progress", name: "Progress %" }]}
        />
        <PieChartCard
          title="Form Template Breakdown"
          description="Backend task distribution by selected form template."
          data={formBreakdown}
          valueKey="value"
          nameKey="name"
        />
      </div>

      <EnterpriseToolbar
        title="Report Actions"
        description={
          isAreaWorkspace
            ? "Search, refresh, print, and inspect backend task reports in read-only mode."
            : "Search, refresh, print, and inspect backend task reports."
        }
        searchValue={toolbarSearch}
        searchPlaceholder="Search task reports..."
        onSearchChange={setToolbarSearch}
        actions={[
          { label: "Refresh", variant: "secondary", onClick: () => void tasksQuery.refetch() },
          { label: "Print", variant: "secondary", onClick: () => window.print() },
        ]}
      />

      <EnterpriseDataTable
        title="Backend Task Report Register"
        description="Search, filter, sort, paginate, customize columns, and export synced task reports."
        data={filteredReports}
        columns={reportColumns}
        searchPlaceholder="Search current result..."
        pageSize={10}
        getRowId={(report) => report.id}
        filterDefinitions={reportFilterDefinitions}
        filters={filters}
        onFiltersChange={setFilters}
        enableFilters
        enableSavedViews
        savedViewScope="backend-task-reports"
        emptyTitle={tasksQuery.isLoading ? "Loading backend reports..." : "No backend task reports found"}
        emptyDescription="Create or complete backend tasks, then synced reports will appear here."
        exportable
        exportFileName="backend-task-reports"
        exportSheetName="Backend Task Reports"
      />
    </main>
  );
}