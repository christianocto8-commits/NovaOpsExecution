"use client";

import {
  BarChartCard,
  DonutChartCard,
  LineChartCard,
  PieChartCard,
} from "@/shared/analytics/charts";
import {
  EnterpriseColumn,
  EnterpriseDataTable,
} from "@/shared/data-table";
import {
  getOutletTaskCompletionTrend,
  getOutletTaskFormBreakdown,
  getOutletTaskPerformance,
  getOutletTaskStatusDistribution,
  getOutletTaskStatusLabel,
  getOutletTaskStoreSummary,
  OutletTaskStoreItem,
  resetOutletTaskStore,
  useOutletTaskStore,
} from "@/shared/outlet-task-store";
import { RealtimeClock } from "@/shared/realtime";

const columns: EnterpriseColumn<OutletTaskStoreItem>[] = [
  { key: "id", header: "Task ID", sortable: true },
  { key: "outlet", header: "Outlet", sortable: true },
  { key: "task", header: "Task", sortable: true },
  { key: "form", header: "Form", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (task) => {
      const statusLabel = getOutletTaskStatusLabel(task.status);

      const statusClass =
        task.status === "completed" || task.status === "submitted"
          ? "bg-emerald-50 text-emerald-700"
          : task.status === "draft"
            ? "bg-blue-50 text-blue-700"
            : task.status === "overdue"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700";

      return (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {statusLabel}
        </span>
      );
    },
  },
  {
    key: "progress",
    header: "Progress",
    sortable: true,
    render: (task) => `${task.progress}%`,
  },
  {
    key: "score",
    header: "Score",
    sortable: true,
    render: (task) => `${task.score}%`,
  },
  { key: "due", header: "Due", sortable: true },
  { key: "operator", header: "Operator", sortable: true },
  { key: "updatedAt", header: "Updated", sortable: true },
];

export default function DashboardPage() {
  const outletTaskItems = useOutletTaskStore();

  const summary = getOutletTaskStoreSummary(outletTaskItems);
  const completionTrend = getOutletTaskCompletionTrend(outletTaskItems);
  const outletPerformance = getOutletTaskPerformance(outletTaskItems);
  const statusDistribution = getOutletTaskStatusDistribution(outletTaskItems);
  const formDistribution = getOutletTaskFormBreakdown(outletTaskItems);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Owner Dashboard
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Outlet Task Form Overview
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Live operational visibility based on outlet task forms, saved
            drafts, submitted forms, completion percentage, and due status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={resetOutletTaskStore}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Reset Store
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Realtime
            </p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Tasks</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {summary.total}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Across all outlets</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Completed / Submitted</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {summary.completed + summary.submitted}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Ready for review</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Draft</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">
            {summary.draft}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Saved by outlet</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">
            {summary.pending}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Not started</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">
            {summary.overdue}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Needs attention</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Avg Progress</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {summary.averageProgress}%
          </p>
          <p className="mt-1 text-xs text-emerald-700">Form completion</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              All Outlet Form Completion
            </p>
            <p className="text-xs text-slate-500">
              Calculated from shared outlet task store.
            </p>
          </div>
          <p className="text-sm font-bold text-emerald-700">
            {summary.averageProgress}%
          </p>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-700 transition-all duration-700"
            style={{ width: `${summary.averageProgress}%` }}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Form Completion Trend"
          description="Daily outlet task form completion and submitted count."
          data={completionTrend}
          xKey="day"
          series={[
            { dataKey: "completion", name: "Completion %" },
            { dataKey: "submitted", name: "Submitted" },
          ]}
        />

        <DonutChartCard
          title="Task Form Status"
          description="Current task form lifecycle across outlets."
          data={statusDistribution}
          nameKey="name"
          valueKey="value"
        />

        <BarChartCard
          title="Outlet Progress"
          description="Current form completion percentage by outlet."
          data={outletPerformance}
          xKey="outlet"
          series={[{ dataKey: "progress", name: "Progress %" }]}
        />

        <PieChartCard
          title="Form Type Distribution"
          description="Task form workload by form template."
          data={formDistribution}
          nameKey="name"
          valueKey="value"
        />
      </section>

      <EnterpriseDataTable
        title="Outlet Task Form Register"
        description="Realtime operational task forms by outlet, status, progress, due date, and operator."
        data={outletTaskItems}
        columns={columns}
        searchPlaceholder="Search outlet task..."
        exportable
        exportFileName="outlet-task-form-register"
        exportSheetName="Outlet Task Forms"
      />
    </main>
  );
}
