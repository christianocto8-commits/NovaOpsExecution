"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { BarChartCard, DonutChartCard, LineChartCard } from "@/shared/analytics/charts";
import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import { RealtimeClock } from "@/shared/realtime";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

type ComplianceRow = {
  id: string;
  outlet: string;
  task: string;
  priority: string;
  status: "Completed" | "In Progress" | "Pending" | "Overdue";
  completion: number;
  due: string;
  assignee: string;
  updated: string;
};

const columns: EnterpriseColumn<ComplianceRow>[] = [
  { key: "id", header: "Task ID", sortable: true },
  { key: "outlet", header: "Outlet", sortable: true },
  { key: "task", header: "Task", sortable: true },
  { key: "priority", header: "Urgency", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
        {row.status}
      </span>
    ),
  },
  {
    key: "completion",
    header: "Completion",
    sortable: true,
    render: (row) => `${row.completion}%`,
  },
  { key: "due", header: "Due", sortable: true },
  { key: "assignee", header: "Assignee", sortable: true },
];

function isOverdue(task: Task) {
  if (!task.due || task.status === "Completed") return false;
  const dueDate = new Date(task.due);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function getCompletion(task: Task) {
  if (task.status === "Completed") return 100;
  if (task.status === "In Progress") return 50;
  return 0;
}

function toRow(task: Task): ComplianceRow {
  return {
    id: task.id,
    outlet: task.outlet,
    task: task.title,
    priority: task.priority,
    status: isOverdue(task) ? "Overdue" : task.status,
    completion: getCompletion(task),
    due: task.due || "-",
    assignee: task.assignee,
    updated: task.activity?.[0]?.timestamp ?? task.due ?? "",
  };
}

function getStatusClass(status: ComplianceRow["status"]) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "In Progress") return "bg-blue-50 text-blue-700";
  if (status === "Overdue") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function getAverage(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function groupByStatus(rows: ComplianceRow[]) {
  const statuses: ComplianceRow["status"][] = ["Completed", "In Progress", "Pending", "Overdue"];
  return statuses.map((status) => ({
    name: status,
    value: rows.filter((row) => row.status === status).length,
  }));
}

function groupByOutlet(rows: ComplianceRow[]) {
  const outlets = Array.from(new Set(rows.map((row) => row.outlet)));

  return outlets.map((outlet) => {
    const outletRows = rows.filter((row) => row.outlet === outlet);
    return {
      outlet,
      progress: getAverage(outletRows.map((row) => row.completion)),
      issues: outletRows.filter((row) => row.status === "Overdue" || row.completion < 100).length,
      total: outletRows.length,
    };
  });
}

function getCompletionTrend(rows: ComplianceRow[]) {
  const days = new Map<string, ComplianceRow[]>();

  rows.forEach((row) => {
    const date = row.updated ? new Date(row.updated) : null;
    const key =
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        : "Unscheduled";

    days.set(key, [...(days.get(key) ?? []), row]);
  });

  return Array.from(days.entries()).map(([day, dayRows]) => ({
    day,
    completion: getAverage(dayRows.map((row) => row.completion)),
    submitted: dayRows.filter((row) => row.status === "Completed").length,
  }));
}

function getComplianceRate(rows: ComplianceRow[]) {
  if (rows.length === 0) return 0;
  return Math.round((rows.filter((row) => row.status === "Completed").length / rows.length) * 100);
}

function getSopHealthLabel(rate: number) {
  if (rate >= 90) return "Strong";
  if (rate >= 75) return "Watch";
  return "At Risk";
}

function getSopHealthClass(rate: number) {
  if (rate >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (rate >= 75) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-red-50 text-red-700 border-red-100";
}

export default function ComplianceCenterPage() {
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

  const rows = useMemo(() => (tasksQuery.data ?? []).map(toRow), [tasksQuery.data]);
  const complianceRate = getComplianceRate(rows);
  const outletPerformance = groupByOutlet(rows);
  const ownerActionQueue = rows
    .filter((row) => row.status === "Overdue" || row.completion < 100 || row.priority === "Critical")
    .sort((first, second) => first.completion - second.completion)
    .slice(0, 5);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Compliance Center</p>
          <h1 className="text-2xl font-semibold text-slate-950">Task Compliance Workspace</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            {isAreaWorkspace
              ? "Area manager dapat memantau compliance task outlet dari data backend secara read-only."
              : "Compliance is calculated from real tasks loaded from the backend."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/tasks"
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Open Task
          </Link>

          <Link
            href="/dashboard/corrective-actions"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            Corrective Actions
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      {tasksQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Unable to load tasks."}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Compliance</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{complianceRate}%</p>
          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSopHealthClass(
              complianceRate
            )}`}
          >
            {getSopHealthLabel(complianceRate)}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">
            {rows.filter((row) => row.status === "Completed").length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Needs Action</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">{ownerActionQueue.length}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-blue-700">
            {rows.filter((row) => row.status === "In Progress").length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg Completion</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {getAverage(rows.map((row) => row.completion))}%
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{isAreaWorkspace ? "Area Action Queue" : "Owner Action Queue"}</p>
              <p className="mt-1 text-xs text-slate-500">{isAreaWorkspace ? "Real tasks in your area that need follow-up." : "Real tasks that are overdue or incomplete."}</p>
            </div>
            <Link href="/dashboard/corrective-actions" className="text-sm font-bold text-emerald-700">
              Review all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {tasksQuery.isLoading ? (
              <div className="rounded-2xl border border-slate-200 p-5 text-sm text-slate-500">
                Loading task compliance...
              </div>
            ) : ownerActionQueue.length ? (
              ownerActionQueue.map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-950">{row.task}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {row.outlet} - Due {row.due}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">Completion</p>
                      <p className="font-semibold text-slate-900">{row.completion}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Urgency</p>
                      <p className="font-semibold text-slate-900">{row.priority}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Assignee</p>
                      <p className="font-semibold text-slate-900">{row.assignee}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                No real task issues right now.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Outlet Compliance Ranking</p>
          <p className="mt-1 text-xs text-slate-500">Based on backend tasks only.</p>

          <div className="mt-5 space-y-4">
            {outletPerformance.length ? (
              outletPerformance.map((item) => (
                <div key={item.outlet}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.outlet}</p>
                      <p className="text-xs text-slate-500">
                        {item.issues} issue{item.issues === 1 ? "" : "s"} across {item.total} tasks
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-950">{item.progress}%</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-700" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No backend task data yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Completion Trend"
          description="Real task completion grouped by task update date."
          data={getCompletionTrend(rows)}
          xKey="day"
          series={[
            { dataKey: "completion", name: "Completion %" },
            { dataKey: "submitted", name: "Completed" },
          ]}
        />

        <DonutChartCard
          title="Task Status Mix"
          description="Current task lifecycle from backend."
          data={groupByStatus(rows)}
          nameKey="name"
          valueKey="value"
        />

        <BarChartCard
          title="Outlet Progress"
          description="Average completion by outlet."
          data={outletPerformance}
          xKey="outlet"
          series={[{ dataKey: "progress", name: "Progress %" }]}
        />
      </section>

      <EnterpriseDataTable
        title="Task Execution Register"
        description="Real backend tasks by outlet, status, completion, due date, and assignee."
        data={rows}
        columns={columns}
        searchPlaceholder="Search task..."
        exportable
        exportFileName="task-compliance-register"
        exportSheetName="Task Compliance"
      />
    </main>
  );
}
