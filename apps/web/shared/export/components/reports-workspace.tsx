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

type RecentReport = {
  id: string;
  checklist: string;
  outlet: string;
  status: string;
  score: string;
  submittedBy: string;
  submittedAt: string;
};

const completionTrend = [
  { day: "Mon", completion: 84, submitted: 42 },
  { day: "Tue", completion: 90, submitted: 48 },
  { day: "Wed", completion: 88, submitted: 45 },
  { day: "Thu", completion: 92, submitted: 51 },
  { day: "Fri", completion: 95, submitted: 56 },
  { day: "Sat", completion: 94, submitted: 53 },
  { day: "Sun", completion: 96, submitted: 58 },
];

const checklistCategory = [
  { category: "Opening", count: 32 },
  { category: "Shift", count: 41 },
  { category: "Cleaning", count: 26 },
  { category: "Audit", count: 19 },
];

const reportStatus = [
  { status: "Submitted", value: 72 },
  { status: "Draft", value: 16 },
  { status: "Need Review", value: 8 },
  { status: "Rejected", value: 4 },
];

const severityMix = [
  { severity: "Pass", value: 68 },
  { severity: "Warning", value: 24 },
  { severity: "Critical", value: 8 },
];

const kpis = [
  { label: "Selected Outlet", value: "Montre", note: "Outlet filter active" },
  { label: "Submitted Reports", value: "118", note: "This week" },
  { label: "Completion Rate", value: "94%", note: "Checklist reports" },
  { label: "Critical Findings", value: "8", note: "Require action" },
];

const recentReports: RecentReport[] = [
  {
    id: "RPT-001",
    checklist: "Opening Checklist",
    outlet: "Montre",
    status: "Submitted",
    score: "96%",
    submittedBy: "Supervisor A",
    submittedAt: "Today, 08:12",
  },
  {
    id: "RPT-002",
    checklist: "Cleaning Audit",
    outlet: "Montre",
    status: "Need Review",
    score: "88%",
    submittedBy: "Lead Barista",
    submittedAt: "Today, 11:30",
  },
  {
    id: "RPT-003",
    checklist: "Shift Checklist",
    outlet: "Montre",
    status: "Submitted",
    score: "94%",
    submittedBy: "Supervisor B",
    submittedAt: "Today, 15:45",
  },
];

const recentReportColumns: EnterpriseColumn<RecentReport>[] = [
  { key: "id", label: "Report ID", sortable: true },
  { key: "checklist", label: "Checklist", sortable: true },
  { key: "outlet", label: "Outlet", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "score", label: "Score", sortable: true },
  { key: "submittedBy", label: "Submitted By", sortable: true },
  { key: "submittedAt", label: "Submitted At", sortable: true },
];

export function ReportsWorkspace() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Reports</p>
        <h1 className="text-2xl font-semibold text-slate-950">
          Outlet Report Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Analyze checklist reports, audit findings, and corrective action
          priorities by selected outlet.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Date Range
            </span>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
              <option>Custom Range</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Outlet
            </span>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500">
              <option>Montre</option>
              <option>Heritage</option>
              <option>Sultan Agung</option>
              <option>Sula</option>
              <option>All Outlets</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Checklist
            </span>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500">
              <option>All Checklist</option>
              <option>Opening Checklist</option>
              <option>Shift Checklist</option>
              <option>Cleaning Audit</option>
              <option>Outlet Audit</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500">
              <option>All Status</option>
              <option>Submitted</option>
              <option>Draft</option>
              <option>Need Review</option>
              <option>Rejected</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Employee
            </span>
            <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500">
              <option>All Employee</option>
              <option>Supervisor A</option>
              <option>Supervisor B</option>
              <option>Lead Barista</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {item.value}
            </p>
            <p className="mt-1 text-xs text-emerald-700">{item.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Report Completion Trend"
          description="Checklist report completion percentage for selected outlet."
          data={completionTrend}
          xKey="day"
          series={[{ dataKey: "completion", name: "Completion %" }]}
        />

        <BarChartCard
          title="Submitted Reports"
          description="Number of submitted checklist reports by day."
          data={completionTrend}
          xKey="day"
          series={[{ dataKey: "submitted", name: "Submitted" }]}
        />

        <BarChartCard
          title="Checklist Category Volume"
          description="Submitted reports by checklist category."
          data={checklistCategory}
          xKey="category"
          series={[{ dataKey: "count", name: "Reports" }]}
        />

        <PieChartCard
          title="Report Status Distribution"
          description="Current report workflow status."
          data={reportStatus}
          nameKey="status"
          valueKey="value"
        />

        <DonutChartCard
          title="Inspection Severity Mix"
          description="Pass, warning, and critical outcomes."
          data={severityMix}
          nameKey="severity"
          valueKey="value"
        />
      </section>

      <EnterpriseDataTable
        title="Recent Checklist Reports"
        description="Searchable, sortable, exportable report list for the selected outlet."
        data={recentReports}
        columns={recentReportColumns}
        searchPlaceholder="Search reports..."
        exportable
        exportFileName="outlet-reports"
        exportSheetName="Reports"
      />
    </main>
  );
}