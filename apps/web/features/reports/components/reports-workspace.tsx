"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, Download, FileText, ListChecks } from "lucide-react";

import { EvidenceReviewHub } from "@/features/evidence/components/evidence-review-hub";
import {
  HistoryDetailDrawer,
  type HistoryDetailSelection,
} from "@/features/history/components/history-detail-drawer";
import {
  enrichTasksWithCompletedSessions,
  resolveTaskSubmissionSelection,
} from "@/features/history/utils/execution-session-history";
import { getReportSummary } from "@/features/reports/reports-api";
import {
  countWorkedTasksForOutlet,
  exportOutletWorkReportPdf,
  exportSingleTaskWorkReportPdf,
  filterWorkedTasksForOutlet,
  isTaskWorkedOn,
} from "@/features/reports/utils/task-work-report-pdf";
import { exportRegulatorReportPacketPdf } from "@/features/reports/utils/regulator-report-packet";
import type { Task } from "@/features/tasks/types";
import { isTaskCompleted, isTaskExpiredOverdue } from "@/features/tasks/utils/task-inbox";
import { queryKeys } from "@/lib/query/keys";
import { getExecutionSessions } from "@/services/execution-session.service";
import {
  formSubmissionService,
  type FormSubmissionResponse,
} from "@/services/form-submission.service";
import { formTemplateService } from "@/services/form-template.service";
import { downloadAuditBundle } from "@/services/reports.service";
import { taskService } from "@/services/task.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { useToast } from "@/shared/toast";

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
  submittedAtRaw: string;
  kind: "task" | "form";
};

type ManagerTab = "riwayat" | "bukti" | "unduh";

function getDateLabel(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  if (task.status === "In Progress") return "in_progress";
  return "pending";
}

function toReportRow(task: Task): ReportRow {
  const progress = getTaskProgress(task);
  const submittedAtRaw =
    task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due ?? "";

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
    submittedAt: isTaskWorkedOn(task) ? getDateLabel(submittedAtRaw) : "-",
    submittedAtRaw,
    kind: "task",
  };
}

function toManualSubmissionReportRow(
  submission: FormSubmissionResponse,
  templateName: string,
  outletName: string
): ReportRow {
  const score = Math.round(submission.score ?? 100);
  const submittedAtRaw = submission.submitted_at ?? "";

  return {
    id: `manual-form-${submission.id}`,
    outlet: outletName,
    task: templateName,
    form: templateName,
    status: "completed",
    progress: 100,
    score,
    operator: submission.responsible_person_name ?? "Outlet Team",
    due: getDateLabel(submittedAtRaw),
    submittedAt: getDateLabel(submittedAtRaw),
    submittedAtRaw,
    kind: "form",
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

  return {
    total: rows.length,
    completed,
    inProgress,
    overdue,
    averageProgress,
  };
}

function resolveManagerTab(value: string | null): ManagerTab {
  if (value === "bukti" || value === "evidence") return "bukti";
  if (value === "unduh" || value === "export") return "unduh";
  return "riwayat";
}

export function ReportsWorkspace() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isOutletWorkspace = workspace.mode === "outlet";
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [periodAnchor] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<ManagerTab>(() =>
    resolveManagerTab(searchParams.get("tab"))
  );
  const [historySelection, setHistorySelection] = useState<HistoryDetailSelection | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingBundle, setIsExportingBundle] = useState(false);
  const [exportingTaskId, setExportingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(resolveManagerTab(searchParams.get("tab")));
  }, [searchParams]);

  const numericOutletId =
    workspace.mode === "outlet"
      ? (workspace.legacyOutletId ??
        (workspace.outletId && /^\d+$/.test(workspace.outletId)
          ? Number(workspace.outletId)
          : undefined))
      : undefined;

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });
  const reportSummaryQuery = useQuery({
    queryKey: ["reports", "summary", workspace.outletId ?? workspace.mode],
    queryFn: getReportSummary,
    retry: false,
    enabled: !isOutletWorkspace,
  });
  const formTemplatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
  });
  const formSubmissionsQuery = useQuery({
    queryKey: [
      "form-submissions",
      "reports",
      workspace.outletId ?? workspace.mode,
      numericOutletId ?? "all",
    ],
    queryFn: () =>
      formSubmissionService.list(
        numericOutletId !== undefined ? { outletId: numericOutletId } : undefined
      ),
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

  const periodFilteredFormSubmissions = useMemo(() => {
    const cutoff = periodAnchor - periodDays * 24 * 60 * 60 * 1000;

    return formSubmissions.filter((submission) => {
      if (numericOutletId !== undefined && submission.outlet_id !== numericOutletId) {
        return false;
      }
      if (submission.status === "draft") return false;
      if (!submission.submitted_at) return true;
      return new Date(submission.submitted_at).getTime() >= cutoff;
    });
  }, [formSubmissions, numericOutletId, periodAnchor, periodDays]);

  const templateNameById = useMemo(() => {
    const map = new Map<number, string>();
    formTemplates.forEach((template) => {
      map.set(Number(template.id), template.name);
    });
    return map;
  }, [formTemplates]);

  const templateNameByStringId = useMemo(() => {
    const map = new Map<string, string>();
    formTemplates.forEach((template) => {
      map.set(template.id, template.name);
    });
    return map;
  }, [formTemplates]);

  const manualSubmissionRows = useMemo(() => {
    const outletNames = new Map<number, string>();

    tasks.forEach((task) => {
      const outletId = Number(task.outletId);
      if (!Number.isFinite(outletId) || !task.outlet?.trim()) return;
      if (/^Outlet\s+\d+$/i.test(task.outlet.trim())) return;
      outletNames.set(outletId, task.outlet.trim());
    });

    periodFilteredFormSubmissions.forEach((submission) => {
      const name = submission.outlet_name?.trim();
      if (name) outletNames.set(submission.outlet_id, name);
    });

    return periodFilteredFormSubmissions.map((submission) =>
      toManualSubmissionReportRow(
        submission,
        templateNameById.get(submission.form_template_id) ?? `Form #${submission.form_template_id}`,
        outletNames.get(submission.outlet_id) ??
          submission.outlet_name?.trim() ??
          workspace.outletName ??
          `Outlet #${submission.outlet_id}`
      )
    );
  }, [
    periodFilteredFormSubmissions,
    tasks,
    templateNameById,
    workspace.outletName,
  ]);

  const reportRows = useMemo(
    () =>
      [...periodFilteredTasks.map(toReportRow), ...manualSubmissionRows].sort(
        (left, right) =>
          new Date(right.submittedAtRaw).getTime() - new Date(left.submittedAtRaw).getTime()
      ),
    [manualSubmissionRows, periodFilteredTasks]
  );

  const clientSummary = useMemo(() => getSummary(reportRows), [reportRows]);
  const backendSummary = reportSummaryQuery.data;
  const summary = {
    completed: backendSummary?.completed_items ?? clientSummary.completed,
    inProgress: backendSummary?.open_tasks ?? clientSummary.inProgress,
    overdue: backendSummary?.overdue_tasks ?? clientSummary.overdue,
    averageProgress: backendSummary?.completion_rate ?? clientSummary.averageProgress,
  };

  const outletNames = useMemo(
    () => Array.from(new Set(scopedTasks.map((task) => task.outlet).filter(Boolean))).sort(),
    [scopedTasks]
  );

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

  const formSubmissionById = useMemo(
    () => new Map(formSubmissions.map((submission) => [submission.id, submission])),
    [formSubmissions]
  );

  function openTrackingDetail(entryId: string) {
    const task = taskById.get(entryId);
    if (!task || !isTaskWorkedOn(task)) return;
    setHistorySelection(resolveTaskSubmissionSelection(task, completedSessionsByTaskId));
  }

  function openReportRow(row: ReportRow) {
    if (row.kind === "form") {
      const submissionId = Number(row.id.replace("manual-form-", ""));
      const submission = formSubmissionById.get(submissionId);
      if (!submission) return;
      setHistorySelection({
        kind: "form",
        submission,
        templateName: row.form,
      });
      return;
    }

    openTrackingDetail(row.id);
  }

  async function handleTaskPdfExport(row: ReportRow) {
    if (row.kind === "form") return;

    const task = taskById.get(row.id);
    if (!task || !isTaskWorkedOn(task)) return;

    setExportingTaskId(row.id);

    try {
      await exportSingleTaskWorkReportPdf(task, formTemplates);
      toast.success("Laporan PDF berhasil diunduh.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat laporan PDF.");
    } finally {
      setExportingTaskId(null);
    }
  }

  async function handleOutletWorkExport(outlet: string) {
    const workedTasks = filterWorkedTasksForOutlet(enrichedScopedTasks, outlet);

    try {
      setIsExportingPdf(true);
      await exportOutletWorkReportPdf({
        outlet,
        tasks: workedTasks,
        templates: formTemplates,
        subtitle: `${workedTasks.length} task dikerjakan`,
      });
      toast.success("Laporan PDF berhasil diunduh.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat laporan PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  function handleRegulatorPacketExport() {
    if (reportRows.length === 0) {
      toast.error("Belum ada data untuk compliance packet.");
      return;
    }

    try {
      exportRegulatorReportPacketPdf({
        periodLabel: `${periodDays} hari terakhir`,
        outletLabel: workspace.outletName ?? "Semua outlet",
        summary: {
          total: reportRows.length,
          completed: summary.completed,
          inProgress: summary.inProgress,
          overdue: summary.overdue,
          averageProgress: summary.averageProgress,
          averageScore: summary.averageProgress,
        },
        rows: reportRows.map((row) => ({
          id: row.id,
          outlet: row.outlet,
          task: row.task,
          form: row.form,
          status: row.status,
          progress: row.progress,
          score: row.score,
          operator: row.operator,
          due: row.due,
          submittedAt: row.submittedAt,
        })),
      });
      toast.success("Compliance packet berhasil diunduh.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat compliance packet.");
    }
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

  const periodControls = (
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
  );

  if (isOutletWorkspace) {
    const completedHistory = [
      ...periodFilteredTasks.filter(isTaskWorkedOn).map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        completedAt: task.execution?.completedAt ?? task.activity?.[0]?.timestamp ?? task.due,
        kind: "task" as const,
        taskId: task.id,
      })),
      ...periodFilteredFormSubmissions.map((submission) => ({
        id: `form-${submission.id}`,
        title:
          templateNameById.get(submission.form_template_id) ??
          `Form #${submission.form_template_id}`,
        completedAt: submission.submitted_at ?? "",
        kind: "form" as const,
        submission,
        templateName:
          templateNameById.get(submission.form_template_id) ??
          `Form #${submission.form_template_id}`,
      })),
    ].sort(
      (left, right) =>
        new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime()
    );

    return (
      <main className={mobileDashboardMainClass}>
        <div>
          <p className="text-sm font-medium text-emerald-700">Laporan</p>
          <h1 className="text-2xl font-semibold text-slate-950">Riwayat Kerja</h1>
          <p className="mt-1 text-sm text-slate-500">
            Semua pekerjaan selesai di {workspace.outletName ?? "outlet ini"} — task dan My Form.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periodControls}
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            {completedHistory.length} selesai
          </span>
        </div>

        {completedHistory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Belum ada pekerjaan selesai pada periode ini.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
            {completedHistory.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.kind === "task") {
                      openTrackingDetail(item.taskId);
                      return;
                    }

                    setHistorySelection({
                      kind: "form",
                      submission: item.submission,
                      templateName: item.templateName,
                    });
                  }}
                  className="flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.kind === "form" ? "My Form · " : ""}
                      {getDateLabel(item.completedAt)}
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

        <HistoryDetailDrawer
          selection={historySelection}
          onClose={() => setHistorySelection(null)}
        />
      </main>
    );
  }

  const tabs: Array<{ id: ManagerTab; label: string; icon: typeof ListChecks }> = [
    { id: "riwayat", label: "Riwayat", icon: ListChecks },
    { id: "bukti", label: "Review Bukti", icon: Camera },
    { id: "unduh", label: "Unduh", icon: Download },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">Laporan</p>
        <h1 className="text-2xl font-semibold text-slate-950">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Satu tempat untuk melihat pekerjaan selesai, review foto bukti, dan unduh laporan.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {periodControls}
        <button
          type="button"
          onClick={() => void tasksQuery.refetch()}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {tasksQuery.isError || reportSummaryQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error
            ? tasksQuery.error.message
            : reportSummaryQuery.error instanceof Error
              ? reportSummaryQuery.error.message
              : "Gagal memuat laporan."}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Selesai</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Terbuka</p>
          <p className="mt-1 text-2xl font-semibold text-blue-700">{summary.inProgress}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Overdue</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{summary.overdue}</p>
        </div>
      </div>

      <div className="inline-flex w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition sm:flex-none ${
                isActive ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "riwayat" ? (
        <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Riwayat kerja</p>
            <p className="text-xs text-slate-500">
              Task selesai dan submission My Form dalam {periodDays} hari terakhir.
            </p>
          </div>

          {reportRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Belum ada pekerjaan selesai pada periode ini.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reportRows.map((row) => {
                const rowTask =
                  row.kind === "task" ? taskById.get(row.id) : undefined;
                const canExportPdf = Boolean(rowTask && isTaskWorkedOn(rowTask));

                return (
                  <li key={row.id}>
                    <div className="flex min-h-[64px] items-center gap-2 px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => openReportRow(row)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                              row.kind === "form"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {row.kind === "form" ? (
                              <FileText className="size-4" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{row.task}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {row.outlet}
                              {row.kind === "form" ? " · My Form" : ""}
                              {" · "}
                              {row.submittedAt}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          Selesai
                        </span>
                      </button>

                      {canExportPdf ? (
                        <button
                          type="button"
                          onClick={() => void handleTaskPdfExport(row)}
                          disabled={exportingTaskId === row.id}
                          title="Download PDF per task"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <Download className="size-4" />
                          {exportingTaskId === row.id ? "Menyiapkan..." : "Export PDF"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {activeTab === "bukti" ? (
        <EvidenceReviewHub
          tasks={enrichedScopedTasks}
          formSubmissions={formSubmissions}
          templateNameById={templateNameByStringId}
          workspace={workspace}
          title="Review bukti foto"
          description="Periksa, setujui, atau tolak bukti dari task dan My Form."
        />
      ) : null}

      {activeTab === "unduh" ? (
        <section className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-950">Export PDF per outlet</p>
            <p className="mt-1 text-sm text-slate-500">
              Unduh laporan hasil pekerjaan beserta checklist.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {outletNames.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2">
                  Belum ada data outlet untuk diexport.
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
                          {workedCount} task dikerjakan
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={workedCount === 0 || isExportingPdf}
                        onClick={() => void handleOutletWorkExport(outlet)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        <Download className="size-4" />
                        {isExportingPdf ? "..." : "PDF"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-semibold text-slate-950">Paket lanjutan</p>
            <p className="mt-1 text-sm text-slate-500">
              Untuk audit atau compliance — opsional.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRegulatorPacketExport}
                disabled={reportRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Download className="size-4" />
                Compliance Packet
              </button>
              <button
                type="button"
                onClick={() => void handleAuditBundleExport()}
                disabled={isExportingBundle}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <Download className="size-4" />
                {isExportingBundle ? "Bundling..." : "Audit Bundle"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <HistoryDetailDrawer selection={historySelection} onClose={() => setHistorySelection(null)} />
    </main>
  );
}
