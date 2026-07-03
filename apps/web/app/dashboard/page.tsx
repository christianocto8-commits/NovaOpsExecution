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

type OutletSummary = {
  outlet: string;
  completion: string;
  compliance: string;
  openTasks: number;
  overdue: number;
  lastActivity: string;
};

const completionTrend = [
  { day: "Mon", completion: 84, compliance: 88 },
  { day: "Tue", completion: 90, compliance: 91 },
  { day: "Wed", completion: 88, compliance: 90 },
  { day: "Thu", completion: 92, compliance: 93 },
  { day: "Fri", completion: 95, compliance: 95 },
  { day: "Sat", completion: 94, compliance: 94 },
  { day: "Sun", completion: 96, compliance: 96 },
];

const outletRanking = [
  { outlet: "Montre", score: 98 },
  { outlet: "Heritage", score: 94 },
  { outlet: "Sultan Agung", score: 89 },
  { outlet: "Sula", score: 86 },
];

const findingCategories = [
  { category: "Cleanliness", count: 18 },
  { category: "Inventory", count: 14 },
  { category: "Equipment", count: 11 },
  { category: "Service", count: 8 },
  { category: "Food Safety", count: 5 },
];

const taskStatus = [
  { status: "Completed", value: 124 },
  { status: "In Progress", value: 28 },
  { status: "Pending", value: 19 },
  { status: "Overdue", value: 9 },
];

const inspectionResult = [
  { result: "Pass", value: 76 },
  { result: "Warning", value: 18 },
  { result: "Critical", value: 6 },
];

const kpis = [
  { label: "Total Outlets", value: "4", note: "Active operating outlets" },
  { label: "Today Checklists", value: "186", note: "Submitted across all outlets" },
  { label: "Completion Rate", value: "94%", note: "All outlets average" },
  { label: "Compliance Score", value: "96%", note: "Enterprise score" },
  { label: "Open Actions", value: "56", note: "Corrective actions pending" },
  { label: "Overdue Actions", value: "9", note: "Need owner attention" },
];

const outletSummary: OutletSummary[] = [
  {
    outlet: "Montre",
    completion: "96%",
    compliance: "98%",
    openTasks: 3,
    overdue: 0,
    lastActivity: "10 min ago",
  },
  {
    outlet: "Heritage",
    completion: "91%",
    compliance: "94%",
    openTasks: 7,
    overdue: 1,
    lastActivity: "15 min ago",
  },
  {
    outlet: "Sultan Agung",
    completion: "88%",
    compliance: "89%",
    openTasks: 10,
    overdue: 3,
    lastActivity: "25 min ago",
  },
  {
    outlet: "Sula",
    completion: "84%",
    compliance: "86%",
    openTasks: 14,
    overdue: 5,
    lastActivity: "40 min ago",
  },
];

const outletColumns: EnterpriseColumn<OutletSummary>[] = [
  { key: "outlet", label: "Outlet", sortable: true },
  { key: "completion", label: "Completion", sortable: true },
  { key: "compliance", label: "Compliance", sortable: true },
  { key: "openTasks", label: "Open Tasks", sortable: true },
  { key: "overdue", label: "Overdue", sortable: true },
  { key: "lastActivity", label: "Last Activity", sortable: true },
];

export default function DashboardPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Owner Dashboard</p>
        <h1 className="text-2xl font-semibold text-slate-950">
          Enterprise Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          All-outlet operational summary for checklist completion, compliance,
          findings, and corrective actions.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
          title="Checklist Completion Trend"
          description="Completion percentage across all outlets."
          data={completionTrend}
          xKey="day"
          series={[{ dataKey: "completion", name: "Completion %" }]}
        />

        <LineChartCard
          title="Compliance Trend"
          description="Compliance score movement across all outlets."
          data={completionTrend}
          xKey="day"
          series={[{ dataKey: "compliance", name: "Compliance %" }]}
        />

        <BarChartCard
          title="Outlet Compliance Ranking"
          description="All active outlets ranked by compliance score."
          data={outletRanking}
          xKey="outlet"
          series={[{ dataKey: "score", name: "Compliance Score" }]}
        />

        <BarChartCard
          title="Most Common Findings"
          description="Global finding categories across all outlets."
          data={findingCategories}
          xKey="category"
          series={[{ dataKey: "count", name: "Findings" }]}
        />

        <PieChartCard
          title="Corrective Action Status"
          description="All corrective actions across the organization."
          data={taskStatus}
          nameKey="status"
          valueKey="value"
        />

        <DonutChartCard
          title="Inspection Result Mix"
          description="Pass, warning, and critical results across all outlets."
          data={inspectionResult}
          nameKey="result"
          valueKey="value"
        />
      </section>

      <EnterpriseDataTable
        title="Outlet Performance Summary"
        description="Owner-level searchable and sortable snapshot of each outlet."
        data={outletSummary}
        columns={outletColumns}
        searchPlaceholder="Search outlet..."
        exportable
        exportFileName="enterprise-outlet-summary"
        exportSheetName="Owner Dashboard"
      />
    </main>
  );
}