"use client";

import { useMemo, useState } from "react";

import {
  BarChartCard,
  DonutChartCard,
  LineChartCard,
  PieChartCard,
} from "@/shared/analytics/charts";
import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import { OutletExportCard } from "@/shared/export/components";
import {
  EnterpriseFilterState,
  FilterBar,
  applyEnterpriseFilters,
} from "@/shared/filters";
import { EnterpriseToolbar } from "@/shared/toolbar";

type RecentReport = {
  id: string;
  checklist: string;
  outlet: string;
  status: string;
  score: string;
  submittedBy: string;
  submittedAt: string;
};

const outlets = ["KOV Montre", "KOV Heritage", "KOV Sultan Agung", "KOV Sula"];

const completionTrend = [
  { day: "Mon", completion: 84, submitted: 42 },
  { day: "Tue", completion: 90, submitted: 48 },
  { day: "Wed", completion: 88, submitted: 45 },
  { day: "Thu", completion: 92, submitted: 51 },
  { day: "Fri", completion: 95, submitted: 56 },
  { day: "Sat", completion: 91, submitted: 49 },
  { day: "Sun", completion: 89, submitted: 44 },
];

const statusDistribution = [
  { name: "Completed", value: 68 },
  { name: "In Review", value: 21 },
  { name: "Flagged", value: 11 },
];

const outletPerformance = [
  { outlet: "KOV Montre", score: 94 },
  { outlet: "KOV Heritage", score: 91 },
  { outlet: "KOV Sultan Agung", score: 88 },
  { outlet: "KOV Sula", score: 86 },
];

const issueBreakdown = [
  { name: "Cleanliness", value: 32 },
  { name: "Service", value: 26 },
  { name: "Product", value: 24 },
  { name: "Equipment", value: 18 },
];

const recentReports: RecentReport[] = [
  {
    id: "RPT-001",
    checklist: "Opening Readiness",
    outlet: "KOV Montre",
    status: "Completed",
    score: "96%",
    submittedBy: "Lead Barista",
    submittedAt: "Today, 07:15",
  },
  {
    id: "RPT-002",
    checklist: "Service Quality Audit",
    outlet: "KOV Heritage",
    status: "In Review",
    score: "89%",
    submittedBy: "Senior Barista",
    submittedAt: "Today, 10:40",
  },
  {
    id: "RPT-003",
    checklist: "Cleanliness Standard",
    outlet: "KOV Sultan Agung",
    status: "Flagged",
    score: "74%",
    submittedBy: "Head Barista",
    submittedAt: "Yesterday, 21:10",
  },
  {
    id: "RPT-004",
    checklist: "Product Availability",
    outlet: "KOV Sula",
    status: "Completed",
    score: "91%",
    submittedBy: "Lead Barista",
    submittedAt: "Yesterday, 16:25",
  },
];

const reportColumns: EnterpriseColumn<RecentReport>[] = [
  { key: "id", header: "Report ID", sortable: true },
  { key: "checklist", header: "Checklist", sortable: true },
  { key: "outlet", header: "Outlet", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (report) => {
      const statusClass =
        report.status === "Completed"
          ? "bg-emerald-50 text-emerald-700"
          : report.status === "In Review"
            ? "bg-amber-50 text-amber-700"
            : "bg-rose-50 text-rose-700";

      return (
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
        >
          {report.status}
        </span>
      );
    },
  },
  { key: "score", header: "Score", sortable: true },
  { key: "submittedBy", header: "Submitted By", sortable: true },
  { key: "submittedAt", header: "Submitted At", sortable: true },
];

const reportFilters = [
  {
    key: "outlet",
    label: "Outlet",
    placeholder: "All outlets",
    options: outlets.map((outlet) => ({ label: outlet, value: outlet })),
  },
  {
    key: "status",
    label: "Status",
    placeholder: "All status",
    options: [
      { label: "Completed", value: "Completed" },
      { label: "In Review", value: "In Review" },
      { label: "Flagged", value: "Flagged" },
    ],
  },
  {
    key: "submittedBy",
    label: "Submitted By",
    placeholder: "All users",
    options: [
      { label: "Senior Barista", value: "Senior Barista" },
      { label: "Lead Barista", value: "Lead Barista" },
      { label: "Head Barista", value: "Head Barista" },
    ],
  },
];

function getOutletFileName(outlet: string) {
  return `${outlet.toLowerCase().replaceAll(" ", "-")}-report`;
}

function getAverageScore(reports: RecentReport[]) {
  if (reports.length === 0) return "0%";

  const total = reports.reduce((sum, report) => {
    return sum + Number(report.score.replace("%", ""));
  }, 0);

  return `${Math.round(total / reports.length)}%`;
}

function downloadBlob(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function exportOutletCsv(outlet: string, reports: RecentReport[]) {
  const headers = [
    "Report ID",
    "Checklist",
    "Outlet",
    "Status",
    "Score",
    "Submitted By",
    "Submitted At",
  ];

  const rows = reports.map((report) => [
    report.id,
    report.checklist,
    report.outlet,
    report.status,
    report.score,
    report.submittedBy,
    report.submittedAt,
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  downloadBlob(csv, `${getOutletFileName(outlet)}.csv`, "text/csv;charset=utf-8;");
}

function exportOutletExcel(outlet: string, reports: RecentReport[]) {
  const rows = reports
    .map(
      (report) => `
        <tr>
          <td>${report.id}</td>
          <td>${report.checklist}</td>
          <td>${report.outlet}</td>
          <td>${report.status}</td>
          <td>${report.score}</td>
          <td>${report.submittedBy}</td>
          <td>${report.submittedAt}</td>
        </tr>
      `,
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        <h2>${outlet} Report</h2>
        <table border="1">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Checklist</th>
              <th>Outlet</th>
              <th>Status</th>
              <th>Score</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    html,
    `${getOutletFileName(outlet)}.xls`,
    "application/vnd.ms-excel;charset=utf-8;",
  );
}

function exportOutletPdf(outlet: string, reports: RecentReport[]) {
  const rows = reports
    .map(
      (report) => `
        <tr>
          <td>${report.id}</td>
          <td>${report.checklist}</td>
          <td>${report.outlet}</td>
          <td>${report.status}</td>
          <td>${report.score}</td>
          <td>${report.submittedBy}</td>
          <td>${report.submittedAt}</td>
        </tr>
      `,
    )
    .join("");

  const printWindow = window.open("", "_blank");

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${outlet} Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 32px;
            color: #0f172a;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 24px;
          }

          p {
            margin: 0 0 24px;
            color: #64748b;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
          }

          th {
            background: #f8fafc;
          }
        </style>
      </head>
      <body>
        <h1>${outlet} Report</h1>
        <p>Generated from NovaOps Reports.</p>

        <table>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Checklist</th>
              <th>Outlet</th>
              <th>Status</th>
              <th>Score</th>
              <th>Submitted By</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

export function ReportsWorkspace() {
  const [filters, setFilters] = useState<EnterpriseFilterState>({
    outlet: null,
    status: null,
    submittedBy: null,
  });

  const [toolbarSearch, setToolbarSearch] = useState("");
  const [openOutlet, setOpenOutlet] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    const filtered = applyEnterpriseFilters(recentReports, filters);

    if (!toolbarSearch.trim()) return filtered;

    const query = toolbarSearch.toLowerCase();

    return filtered.filter((report) => {
      return Object.values(report).some((value) =>
        String(value).toLowerCase().includes(query),
      );
    });
  }, [filters, toolbarSearch]);

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Reports</p>
        <h1 className="text-2xl font-semibold text-slate-950">
          Outlet-Level Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track checklist completion, outlet performance, report status, and
          operational issue trends.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completion Rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">91%</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Submitted Reports</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">341</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Flagged Issues</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">18</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Average Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">88%</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LineChartCard
          title="Checklist Completion Trend"
          description="Daily completion rate and submitted reports."
          data={completionTrend}
          xKey="day"
          series={[
            { dataKey: "completion", name: "Completion %" },
            { dataKey: "submitted", name: "Submitted" },
          ]}
        />

        <DonutChartCard
          title="Report Status Distribution"
          description="Current report lifecycle overview."
          data={statusDistribution}
          dataKey="value"
          nameKey="name"
        />

        <BarChartCard
          title="Outlet Performance"
          description="Average operational report score by outlet."
          data={outletPerformance}
          xKey="outlet"
          series={[{ dataKey: "score", name: "Score" }]}
        />

        <PieChartCard
          title="Issue Breakdown"
          description="Common operational issue categories."
          data={issueBreakdown}
          dataKey="value"
          nameKey="name"
        />
      </div>

      <EnterpriseToolbar
        title="Report Actions"
        description="Centralized controls for report search, refresh, print, and settings."
        searchValue={toolbarSearch}
        searchPlaceholder="Search reports..."
        onSearchChange={setToolbarSearch}
        actions={[
          {
            label: "Refresh",
            variant: "secondary",
            onClick: () => {
              setToolbarSearch("");
              setFilters({
                outlet: null,
                status: null,
                submittedBy: null,
              });
            },
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

      <FilterBar
        filters={reportFilters}
        value={filters}
        onChange={setFilters}
        onApply={() => {}}
        onReset={() => {}}
      />

      <EnterpriseDataTable
        title="Recent Reports"
        description="Search, filter, sort, paginate, and export filtered outlet reports."
        data={filteredReports}
        columns={reportColumns}
        searchPlaceholder="Search reports..."
        exportFileName="novaops-reports-filtered"
      />

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Outlet Report Export
          </p>
          <h2 className="text-xl font-semibold text-slate-950">
            Export Reports Per Outlet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Open one outlet at a time and export dedicated outlet reports.
          </p>
        </div>

        <div className="space-y-3">
          {outlets.map((outlet) => {
            const outletReports = recentReports.filter(
              (report) => report.outlet === outlet,
            );

            return (
              <OutletExportCard
                key={outlet}
                outlet={outlet}
                totalReports={outletReports.length}
                averageScore={getAverageScore(outletReports)}
                flaggedIssues={
                  outletReports.filter((report) => report.status === "Flagged")
                    .length
                }
                lastUpdated={outletReports[0]?.submittedAt ?? "-"}
                isOpen={openOutlet === outlet}
                onToggle={() =>
                  setOpenOutlet((current) =>
                    current === outlet ? null : outlet,
                  )
                }
                onExportExcel={() => exportOutletExcel(outlet, outletReports)}
                onExportPdf={() => exportOutletPdf(outlet, outletReports)}
                onExportCsv={() => exportOutletCsv(outlet, outletReports)}
              />
            );
          })}
        </div>
      </section>
    </main>
  );
}