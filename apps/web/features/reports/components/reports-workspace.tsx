"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

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
  { key: "progress", header: "Progress", sortable: true, hideable: true, render: (report) => `${report.progress}%` },
  { key: "score", header: "Score", sortable: true, hideable: true, render: (report) => `${report.score}%` },
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
    <main className="space-y-6 p-6">
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
        description={isAreaWorkspace ? "Search, refresh, print, and inspect backend task reports in read-only mode." : "Search, refresh, print, and inspect backend task reports."}
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
