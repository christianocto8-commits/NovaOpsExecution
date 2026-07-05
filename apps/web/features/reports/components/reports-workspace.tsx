"use client";

import { useMemo, useState } from "react";

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
import { EnterpriseToolbar } from "@/shared/toolbar";

const reportColumns: EnterpriseColumn<OutletTaskStoreItem>[] = [
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
        report.status === "completed" || report.status === "submitted"
          ? "bg-emerald-50 text-emerald-700"
          : report.status === "draft"
            ? "bg-blue-50 text-blue-700"
            : report.status === "overdue"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700";

      return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
          {getOutletTaskStatusLabel(report.status)}
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
  {
    key: "submittedAt",
    header: "Submitted At",
    sortable: true,
    hideable: true,
  },
];

const initialReportFilters: EnterpriseFilterState = {
  outlet: "",
  form: "",
  status: "",
};

export function ReportsWorkspace() {
  const outletTaskItems = useOutletTaskStore();

  const [filters, setFilters] = useState<EnterpriseFilterState>(initialReportFilters);
  const [toolbarSearch, setToolbarSearch] = useState("");

  const summary = getOutletTaskStoreSummary(outletTaskItems);
  const completionTrend = getOutletTaskCompletionTrend(outletTaskItems);
  const statusDistribution = getOutletTaskStatusDistribution(outletTaskItems);
  const outletPerformance = getOutletTaskPerformance(outletTaskItems);
  const formBreakdown = getOutletTaskFormBreakdown(outletTaskItems);

  const reportFilterDefinitions: EnterpriseFilterDefinition[] = useMemo(() => {
    const outlets = Array.from(new Set(outletTaskItems.map((report) => report.outlet)));

    const forms = Array.from(new Set(outletTaskItems.map((report) => report.form)));

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
          { label: "Submitted", value: "submitted" },
          { label: "Draft", value: "draft" },
          { label: "Pending", value: "pending" },
          { label: "Overdue", value: "overdue" },
        ],
      },
    ];
  }, [outletTaskItems]);

  const searchedReports = useMemo(() => {
    if (!toolbarSearch.trim()) return outletTaskItems;

    const query = toolbarSearch.toLowerCase();

    return outletTaskItems.filter((report) =>
      Object.values(report).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [outletTaskItems, toolbarSearch]);

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
          <h1 className="text-2xl font-semibold text-slate-950">Outlet Task Form Reports</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Live operational reports based on shared outlet task store, saved drafts, submitted
            forms, completion percentage, due status, and operator activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetReports();
              resetOutletTaskStore();
            }}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Reset Store
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completion Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.averageProgress}%</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Submitted / Completed</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {summary.submitted + summary.completed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Draft / In Progress</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">{summary.draft}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Average Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.averageScore}%</p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-950">Outlet Form Completion</p>
            <p className="text-xs text-slate-500">Calculated from shared outlet task store.</p>
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
          title="Task Form Completion Trend"
          description="Daily completion percentage and submitted task form count."
          data={completionTrend}
          xKey="day"
          series={[
            { dataKey: "completion", name: "Completion %" },
            { dataKey: "submitted", name: "Submitted" },
          ]}
        />

        <DonutChartCard
          title="Task Form Status Distribution"
          description="Current form lifecycle status across outlets."
          data={statusDistribution}
          valueKey="value"
          nameKey="name"
        />

        <BarChartCard
          title="Outlet Form Progress"
          description="Average task form progress per outlet."
          data={outletPerformance}
          xKey="outlet"
          series={[{ dataKey: "progress", name: "Progress %" }]}
        />

        <PieChartCard
          title="Form Template Breakdown"
          description="Task form distribution by template."
          data={formBreakdown}
          valueKey="value"
          nameKey="name"
        />
      </div>

      <EnterpriseToolbar
        title="Task Form Report Actions"
        description="Search, refresh, print, and inspect outlet task form reports."
        searchValue={toolbarSearch}
        searchPlaceholder="Search task form reports..."
        onSearchChange={setToolbarSearch}
        actions={[
          {
            label: "Refresh",
            variant: "secondary",
            onClick: resetReports,
          },
          {
            label: "Print",
            variant: "secondary",
            onClick: () => window.print(),
          },
          {
            label: "Settings",
            variant: "ghost",
            onClick: () => {},
          },
        ]}
      />

      <EnterpriseDataTable
        title="Outlet Task Form Register"
        description="Search, filter, sort, paginate, customize columns, and save outlet task form report views."
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
        savedViewScope="outlet-task-store-reports"
        emptyTitle="No task form reports found"
        emptyDescription="Try adjusting task form search or filter criteria."
        exportable
        exportFileName="outlet-task-form-reports"
        exportSheetName="Outlet Task Form Reports"
      />
    </main>
  );
}
