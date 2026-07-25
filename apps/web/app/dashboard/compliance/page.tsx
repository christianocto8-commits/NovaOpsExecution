"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { useActiveFormTemplates } from "@/features/forms/hooks/use-form-templates";
import { BarChartCard, DonutChartCard, LineChartCard } from "@/shared/analytics/charts";
import {
  getChecklistTrend30Days,
  getOutletScoreHeatmap,
} from "@/features/compliance/utils/compliance-trend";
import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import { RealtimeClock } from "@/shared/realtime";
import { queryKeys } from "@/lib/query/keys";
import { getExecutionSessions } from "@/services/execution-session.service";
import { downloadComplianceExport, getFailedChecklistItems, getTemplateComplianceTrends } from "@/services/reports.service";
import { outletService } from "@/services/outlet.service";
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
  region: string;
  district: string;
  task: string;
  priority: string;
  status: "Completed" | "In Progress" | "Pending" | "Overdue" | "Cancelled";
  completion: number;
  due: string;
  assignee: string;
  updated: string;
};

const columns: EnterpriseColumn<ComplianceRow>[] = [
  { key: "id", header: "Task ID", sortable: true },
  { key: "outlet", header: "Outlet", sortable: true },
  { key: "region", header: "Region", sortable: true },
  { key: "district", header: "District", sortable: true },
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
  if (task.execution?.checklist) {
    return task.execution.checklist.score;
  }
  if (task.status === "Completed") return 100;
  if (task.status === "In Progress") return 50;
  return 0;
}

function getChecklistStatus(task: Task) {
  return task.execution?.checklist?.status;
}

function toRow(
  task: Task,
  outletRegionByName: Map<string, string>,
  outletDistrictByName: Map<string, string>
): ComplianceRow {
  const checklistStatus = getChecklistStatus(task);

  return {
    id: task.id,
    outlet: task.outlet,
    region: outletRegionByName.get(task.outlet) ?? "—",
    district: outletDistrictByName.get(task.outlet) ?? "—",
    task: task.title,
    priority: task.priority,
    status:
      checklistStatus === "fail"
        ? "Overdue"
        : isOverdue(task)
          ? "Overdue"
          : task.status,
    completion: getCompletion(task),
    due: task.due || "-",
    assignee: task.assignee,
    updated: task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due ?? "",
  };
}

function getStatusClass(status: ComplianceRow["status"]) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "In Progress") return "bg-blue-50 text-blue-700";
  if (status === "Overdue") return "bg-red-50 text-red-700";
  if (status === "Cancelled") return "bg-slate-100 text-slate-600";
  return "bg-amber-50 text-amber-700";
}

function getAverage(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function groupByStatus(rows: ComplianceRow[]) {
  const statuses: ComplianceRow["status"][] = ["Completed", "In Progress", "Pending", "Overdue", "Cancelled"];
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

function groupByRegion(rows: ComplianceRow[]) {
  const regions = Array.from(
    new Set(rows.map((row) => row.region).filter((region) => region && region !== "—"))
  );

  return regions.map((region) => {
    const regionRows = rows.filter((row) => row.region === region);
    return {
      region,
      progress: getAverage(regionRows.map((row) => row.completion)),
      compliance: getComplianceRate(regionRows),
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

function getHeatmapClass(tone: "strong" | "watch" | "risk" | "empty") {
  if (tone === "strong") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "watch") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "risk") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export default function ComplianceCenterPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const { settings } = useSettings();
  const passThreshold = settings?.pass_threshold ?? 85;
  const capaEnabled = isCapaEnabled(settings);
  const { activeTemplates } = useActiveFormTemplates();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isAreaWorkspace = workspace.mode === "area";

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: () => taskService.listAll(),
    retry: false,
  });

  const executionSessionsQuery = useQuery({
    queryKey: ["execution-sessions", "compliance"],
    queryFn: () => getExecutionSessions({ sourceType: "sop_task" }),
    retry: false,
  });

  const failedItemsQuery = useQuery({
    queryKey: ["reports", "failed-checklist-items"],
    queryFn: () => getFailedChecklistItems({ limit: 8, days: 30 }),
    retry: false,
  });

  const templateTrendQuery = useQuery({
    queryKey: ["reports", "template-trends", selectedTemplateId],
    queryFn: () => getTemplateComplianceTrends(selectedTemplateId, { days: 30 }),
    enabled: Boolean(selectedTemplateId),
    retry: false,
  });

  const outletsQuery = useQuery({
    queryKey: ["outlets", "legacy", "compliance"],
    queryFn: () => outletService.listMine(),
    retry: false,
  });

  const outletRegionByName = useMemo(() => {
    const map = new Map<string, string>();
    (outletsQuery.data ?? []).forEach((outlet) => {
      if (outlet.region) {
        map.set(outlet.name, outlet.region);
      }
    });
    return map;
  }, [outletsQuery.data]);

  const outletDistrictByName = useMemo(() => {
    const map = new Map<string, string>();
    (outletsQuery.data ?? []).forEach((outlet) => {
      if (outlet.district) {
        map.set(outlet.name, outlet.district);
      }
    });
    return map;
  }, [outletsQuery.data]);

  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    (outletsQuery.data ?? []).forEach((outlet) => {
      if (outlet.region?.trim()) {
        regions.add(outlet.region.trim());
      }
    });
    return Array.from(regions).sort((a, b) => a.localeCompare(b, "id"));
  }, [outletsQuery.data]);

  const availableDistricts = useMemo(() => {
    const districts = new Set<string>();
    (outletsQuery.data ?? []).forEach((outlet) => {
      if (outlet.district?.trim()) {
        districts.add(outlet.district.trim());
      }
    });
    return Array.from(districts).sort((a, b) => a.localeCompare(b, "id"));
  }, [outletsQuery.data]);

  useEffect(() => {
    if (selectedTemplateId) return;
    const firstPersisted = activeTemplates.find((template) => /^\d+$/.test(template.id));
    if (firstPersisted) {
      setSelectedTemplateId(firstPersisted.id);
    }
  }, [activeTemplates, selectedTemplateId]);

  const tasksWithExecution = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const sessions = executionSessionsQuery.data ?? [];
    const latestCompletedMap = new Map<string, (typeof sessions)[number]>();

    sessions.forEach((session) => {
      if (session.status !== "completed" || session.task_id == null) return;
      const taskId = String(session.task_id);
      const current = latestCompletedMap.get(taskId);
      if (!current || session.id > current.id) {
        latestCompletedMap.set(taskId, session);
      }
    });

    return tasks.map((task) => {
      const session = latestCompletedMap.get(task.id);
      if (!session?.answers_json || typeof session.answers_json !== "object") {
        return task;
      }

      const checklist = (session.answers_json as Record<string, unknown>)._checklist;
      if (!checklist || typeof checklist !== "object") {
        return task;
      }

      const payload = checklist as Record<string, unknown>;
      const rawStatus = payload.status;
      if (rawStatus !== "pass" && rawStatus !== "attention" && rawStatus !== "fail") {
        return task;
      }
      const checklistStatus: "pass" | "attention" | "fail" = rawStatus;

      return {
        ...task,
        execution: {
          operatorName: task.execution?.operatorName ?? "",
          operatorPosition: task.execution?.operatorPosition ?? "Crew",
          note: task.execution?.note ?? "",
          evidence: task.execution?.evidence ?? [],
          formResponses: task.execution?.formResponses ?? {},
          completedAt: task.execution?.completedAt ?? session.submitted_at ?? "",
          checklist: {
            score: typeof payload.score === "number" ? payload.score : Number(payload.score ?? 0),
            passed_count: typeof payload.passed_count === "number" ? payload.passed_count : 0,
            failed_count: typeof payload.failed_count === "number" ? payload.failed_count : 0,
            total_scorable: typeof payload.total_scorable === "number" ? payload.total_scorable : 0,
            failed_items: Array.isArray(payload.failed_items)
              ? payload.failed_items.map((item) => {
                  const row = item as Record<string, unknown>;
                  return {
                    field_id: Number(row.field_id),
                    label: typeof row.label === "string" ? row.label : "Unknown field",
                    value:
                      typeof row.value === "string"
                        ? row.value
                        : row.value == null
                          ? null
                          : String(row.value),
                    reason: typeof row.reason === "string" ? row.reason : "Failed",
                  };
                })
              : [],
            status: checklistStatus,
          },
        },
      };
    });
  }, [tasksQuery.data, executionSessionsQuery.data]);

  const allRows = useMemo(
    () => tasksWithExecution.map((task) => toRow(task, outletRegionByName, outletDistrictByName)),
    [tasksWithExecution, outletRegionByName, outletDistrictByName]
  );

  const rows = useMemo(() => {
    return allRows.filter((row) => {
      if (regionFilter !== "all" && row.region !== regionFilter) return false;
      if (districtFilter !== "all" && row.district !== districtFilter) return false;
      return true;
    });
  }, [allRows, regionFilter, districtFilter]);
  const complianceRate = getComplianceRate(rows);
  const outletPerformance = groupByOutlet(rows);
  const regionPerformance = useMemo(() => groupByRegion(rows), [rows]);
  const checklistTrend30Days = useMemo(
    () => getChecklistTrend30Days(executionSessionsQuery.data ?? [], passThreshold),
    [executionSessionsQuery.data, passThreshold]
  );
  const outletHeatmap = useMemo(() => {
    const taskOutletById = new Map(
      (tasksQuery.data ?? []).map((task) => [task.id, task.outlet] as const)
    );

    return getOutletScoreHeatmap(
      executionSessionsQuery.data ?? [],
      taskOutletById,
      passThreshold
    );
  }, [executionSessionsQuery.data, tasksQuery.data, passThreshold]);
  const failedItemsChartData = useMemo(
    () =>
      (failedItemsQuery.data?.items ?? []).map((item) => ({
        label: item.label,
        failures: item.failure_count,
      })),
    [failedItemsQuery.data]
  );
  const repeatFailures = useMemo(
    () =>
      (failedItemsQuery.data?.items ?? [])
        .filter((item) => item.failure_count > 1)
        .slice(0, 4),
    [failedItemsQuery.data]
  );
  const templateTrendChartData = useMemo(
    () =>
      (templateTrendQuery.data?.points ?? []).map((point) => ({
        day: point.date,
        score: point.score,
        passRate: point.pass_rate,
      })),
    [templateTrendQuery.data]
  );
  const ownerActionQueue = rows
    .filter((row) => row.status === "Overdue" || row.completion < 100 || row.priority === "Critical")
    .sort((first, second) => first.completion - second.completion)
    .slice(0, 5);
  const riskInsights = useMemo(() => {
    const outletRisk = groupByOutlet(rows)
      .filter((item) => item.total > 0)
      .sort((first, second) => first.progress - second.progress)[0];
    const weakestTemplate = [...rows]
      .filter((row) => row.completion < passThreshold)
      .sort((first, second) => first.completion - second.completion)[0];
    const overdueCount = rows.filter((row) => row.status === "Overdue").length;
    const criticalCount = rows.filter((row) => row.priority === "Critical").length;

    return [
      {
        label: "Highest risk outlet",
        value: outletRisk ? outletRisk.outlet : "-",
        detail: outletRisk
          ? `${outletRisk.progress}% compliance, ${outletRisk.issues} issue`
          : "No outlet risk detected",
        tone: outletRisk && outletRisk.progress < passThreshold ? "risk" : "ok",
      },
      {
        label: "Weakest checklist",
        value: weakestTemplate ? weakestTemplate.task : "-",
        detail: weakestTemplate
          ? `${weakestTemplate.outlet}, score ${weakestTemplate.completion}%`
          : "No checklist below threshold",
        tone: weakestTemplate ? "risk" : "ok",
      },
      {
        label: "Operational pressure",
        value: `${overdueCount} overdue`,
        detail: `${criticalCount} critical priority task${criticalCount === 1 ? "" : "s"}`,
        tone: overdueCount > 0 || criticalCount > 0 ? "watch" : "ok",
      },
    ];
  }, [passThreshold, rows]);

  async function handleExportExcel() {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadComplianceExport("xlsx");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPdf() {
    setExportError(null);
    setIsExportingPdf(true);
    try {
      await downloadComplianceExport("pdf");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export PDF gagal.");
    } finally {
      setIsExportingPdf(false);
    }
  }

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
          {availableRegions.length > 0 ? (
            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Region
              </span>
              <select
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="all">Semua Region</option>
                {availableRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {availableDistricts.length > 0 ? (
            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                District
              </span>
              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
              >
                <option value="all">Semua District</option>
                {availableDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Link
            href="/dashboard/tasks"
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            Open Task
          </Link>

          {capaEnabled ? (
            <Link
              href="/dashboard/corrective-actions"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              Corrective Actions
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => void handleExportExcel()}
            disabled={isExporting || isExportingPdf}
            className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? "Exporting..." : "Export Excel"}
          </button>

          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={isExporting || isExportingPdf}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExportingPdf ? "Exporting..." : "Export PDF"}
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Realtime</p>
            <RealtimeClock />
          </div>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {exportError}
        </div>
      ) : null}

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

      <section className="grid gap-4 lg:grid-cols-3">
        {riskInsights.map((insight) => (
          <div
            key={insight.label}
            className={[
              "rounded-2xl border bg-white p-5 shadow-sm",
              insight.tone === "risk"
                ? "border-red-200"
                : insight.tone === "watch"
                  ? "border-amber-200"
                  : "border-emerald-100",
            ].join(" ")}
          >
            <p className="text-sm font-semibold text-slate-500">{insight.label}</p>
            <p className="mt-2 truncate text-xl font-bold text-slate-950">{insight.value}</p>
            <p className="mt-1 text-sm text-slate-500">{insight.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{isAreaWorkspace ? "Area Action Queue" : "Owner Action Queue"}</p>
              <p className="mt-1 text-xs text-slate-500">{isAreaWorkspace ? "Real tasks in your area that need follow-up." : "Real tasks that are overdue or incomplete."}</p>
            </div>
            {capaEnabled ? (
              <Link href="/dashboard/corrective-actions" className="text-sm font-bold text-emerald-700">
                Review all
              </Link>
            ) : (
              <Link href="/dashboard/tasks" className="text-sm font-bold text-emerald-700">
                Review all
              </Link>
            )}
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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <LineChartCard
          title="30-Day Checklist Score Trend"
          description={`Average checklist score and pass rate from execution sessions (threshold ${passThreshold}%).`}
          data={checklistTrend30Days}
          xKey="day"
          series={[
            { dataKey: "score", name: "Avg Score %" },
            { dataKey: "passRate", name: "Pass Rate %" },
          ]}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Trend per Template Form</p>
              <p className="mt-1 text-xs text-slate-500">
                Skor harian dan pass rate untuk submission template terpilih (30 hari).
              </p>
            </div>
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              className="h-10 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Pilih template form...</option>
              {activeTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {!selectedTemplateId ? (
            <p className="text-sm text-slate-500">Pilih template form untuk melihat trend.</p>
          ) : templateTrendQuery.isLoading ? (
            <p className="text-sm text-slate-500">Memuat trend template...</p>
          ) : templateTrendQuery.isError ? (
            <p className="text-sm text-red-600">Gagal memuat trend template.</p>
          ) : (
            <LineChartCard
              title={
                activeTemplates.find((template) => template.id === selectedTemplateId)?.name ??
                "Template"
              }
              description="Skor rata-rata dan pass rate per hari."
              data={templateTrendChartData}
              xKey="day"
              series={[
                { dataKey: "score", name: "Skor %" },
                { dataKey: "passRate", name: "Pass Rate %" },
              ]}
            />
          )}
        </div>

        <BarChartCard
          title="Top Failed Checklist Items"
          description="Most frequently failed checklist fields in the last 30 days."
          data={failedItemsChartData}
          xKey="label"
          series={[{ dataKey: "failures", name: "Failures" }]}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-950">Repeat Failure Drill-down</p>
          <p className="mt-1 text-xs text-slate-500">
            Checklist question yang gagal berulang dan perlu masuk CAPA/root cause review.
          </p>
          <div className="mt-4 space-y-3">
            {repeatFailures.length ? (
              repeatFailures.map((item) => (
                <div key={`${item.label}-${item.failure_count}`} className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold text-red-950">{item.label}</p>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-red-700">
                      {item.failure_count}x
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-red-800">
                    Prioritaskan investigasi outlet/template yang memunculkan item ini berulang.
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Belum ada failed checklist item yang berulang dalam periode ini.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <p className="text-sm font-semibold text-slate-950">Outlet Score Heatmap</p>
          <p className="mt-1 text-xs text-slate-500">
            Green ≥ {passThreshold}%, amber watch zone, red at risk.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {outletHeatmap.length ? (
              outletHeatmap.map((item) => (
                <button
                  key={item.outlet}
                  type="button"
                  onClick={() =>
                    router.push(`/dashboard/history?outlet=${encodeURIComponent(item.outlet)}`)
                  }
                  className={`rounded-2xl border p-4 text-left transition hover:scale-[1.01] hover:shadow-md ${getHeatmapClass(item.tone)}`}
                >
                  <p className="text-sm font-bold">{item.outlet}</p>
                  <p className="mt-2 text-2xl font-bold">{item.score}%</p>
                  <p className="mt-1 text-xs opacity-80">{item.submissions} submission(s)</p>
                  <p className="mt-2 text-[11px] font-semibold opacity-70">View history →</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Submit scored checklists to populate outlet heatmap.
              </p>
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

        <BarChartCard
          title="Compliance per Region"
          description="Rata-rata completion dan compliance % per region outlet."
          data={regionPerformance}
          xKey="region"
          series={[
            { dataKey: "progress", name: "Completion %" },
            { dataKey: "compliance", name: "Compliance %" },
          ]}
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
