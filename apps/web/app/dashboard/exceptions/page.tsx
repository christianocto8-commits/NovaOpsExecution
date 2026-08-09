"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  ClipboardPlus,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";

import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { incidentService, type IncidentSeverity } from "@/services/incident.service";
import { taskService } from "@/services/task.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { useToast } from "@/shared/toast";

type ExceptionType =
  | "overdue"
  | "checklist_failed"
  | "missing_evidence"
  | "rejected"
  | "low_compliance";

type ExceptionItem = {
  id: string;
  type: ExceptionType;
  title: string;
  outlet: string;
  outletId: string;
  severity: "critical" | "high" | "medium";
  summary: string;
  due?: string;
  taskId?: string;
  score?: number;
};

const typeLabels: Record<ExceptionType, string> = {
  overdue: "Overdue",
  checklist_failed: "Checklist Gagal",
  missing_evidence: "Missing Evidence",
  rejected: "Rejected",
  low_compliance: "Low Compliance",
};

const severityClass = {
  critical: "border-red-200 bg-red-50 text-red-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  medium: "border-slate-200 bg-slate-50 text-slate-700",
};

function isOverdue(task: Task) {
  if (!task.due || task.backendStatus === "completed" || task.status === "Completed") return false;
  const due = new Date(task.due);
  return Number.isFinite(due.getTime()) && due.getTime() < Date.now();
}

function hasEvidence(task: Task) {
  return Boolean(task.execution?.evidence?.length || task.execution?.note?.trim());
}

function getChecklistFailedCount(task: Task) {
  return task.execution?.checklist?.failed_count ?? 0;
}

function getTaskScore(task: Task) {
  return task.execution?.checklist?.score;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildExceptionItems(tasks: Task[]): ExceptionItem[] {
  const items: ExceptionItem[] = [];
  const outletStats = new Map<
    string,
    { outlet: string; outletId: string; total: number; completed: number; failed: number }
  >();

  tasks.forEach((task) => {
    const outletKey = task.outletId ?? task.outlet;
    const current = outletStats.get(outletKey) ?? {
      outlet: task.outlet,
      outletId: task.outletId ?? "",
      total: 0,
      completed: 0,
      failed: 0,
    };

    current.total += 1;
    if (task.backendStatus === "completed" || task.status === "Completed") current.completed += 1;
    if (getChecklistFailedCount(task) > 0) current.failed += 1;
    outletStats.set(outletKey, current);

    if (isOverdue(task)) {
      items.push({
        id: `overdue-${task.id}`,
        type: "overdue",
        title: task.title,
        outlet: task.outlet,
        outletId: task.outletId ?? "",
        severity: "critical",
        summary: "Task melewati due time dan belum selesai.",
        due: task.due,
        taskId: task.id,
      });
    }

    const failedCount = getChecklistFailedCount(task);
    if (failedCount > 0) {
      items.push({
        id: `failed-${task.id}`,
        type: "checklist_failed",
        title: task.title,
        outlet: task.outlet,
        outletId: task.outletId ?? "",
        severity: failedCount >= 3 ? "critical" : "high",
        summary: `${failedCount} item checklist gagal.`,
        due: task.due,
        taskId: task.id,
        score: getTaskScore(task),
      });
    }

    if (task.backendStatus === "completed" && !hasEvidence(task)) {
      items.push({
        id: `missing-evidence-${task.id}`,
        type: "missing_evidence",
        title: task.title,
        outlet: task.outlet,
        outletId: task.outletId ?? "",
        severity: "high",
        summary: "Task selesai tanpa evidence atau catatan eksekusi.",
        due: task.due,
        taskId: task.id,
      });
    }

    if (task.execution?.reviewStatus === "rejected") {
      items.push({
        id: `rejected-${task.id}`,
        type: "rejected",
        title: task.title,
        outlet: task.outlet,
        outletId: task.outletId ?? "",
        severity: "high",
        summary: task.execution.reviewNote || "Evidence/report ditolak dan perlu tindak lanjut.",
        due: task.due,
        taskId: task.id,
      });
    }
  });

  outletStats.forEach((stats, outletKey) => {
    if (stats.total < 3) return;
    const compliance = Math.round(((stats.completed - stats.failed) / stats.total) * 100);
    if (compliance >= 70) return;

    items.push({
      id: `low-compliance-${outletKey}`,
      type: "low_compliance",
      title: stats.outlet,
      outlet: stats.outlet,
      outletId: stats.outletId,
      severity: compliance < 50 ? "critical" : "medium",
      summary: `Compliance outlet ${Math.max(0, compliance)}% dari ${stats.total} task.`,
      score: Math.max(0, compliance),
    });
  });

  return items.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export default function ExceptionDashboardPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const [typeFilter, setTypeFilter] = useState<ExceptionType | "all">("all");
  const [search, setSearch] = useState("");
  const [followUpItem, setFollowUpItem] = useState<ExceptionItem | null>(null);
  const [followUp, setFollowUp] = useState({
    title: "",
    instructions: "",
    priority: "high" as IncidentSeverity,
    dueAt: "",
  });

  const tasksQuery = useQuery({
    queryKey: [...queryKeys.sop.tasks(), "exceptions"],
    queryFn: () => taskService.listAll(),
  });

  const scopedTasks = useMemo(
    () => filterTasksForWorkspace(tasksQuery.data ?? [], workspace),
    [tasksQuery.data, workspace]
  );
  const allItems = useMemo(() => buildExceptionItems(scopedTasks), [scopedTasks]);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!query) return true;
      return [item.title, item.outlet, item.summary, typeLabels[item.type]]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [allItems, search, typeFilter]);

  const counts = useMemo(() => {
    return allItems.reduce<Record<ExceptionType, number>>(
      (current, item) => ({
        ...current,
        [item.type]: current[item.type] + 1,
      }),
      {
        overdue: 0,
        checklist_failed: 0,
        missing_evidence: 0,
        rejected: 0,
        low_compliance: 0,
      }
    );
  }, [allItems]);

  const followUpMutation = useMutation({
    mutationFn: incidentService.createFollowUp,
    onSuccess: async () => {
      toast.success("Follow-up action dibuat.");
      setFollowUpItem(null);
      setFollowUp({ title: "", instructions: "", priority: "high", dueAt: "" });
      await queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Follow-up gagal dibuat."),
  });

  const openFollowUp = (item: ExceptionItem) => {
    setFollowUpItem(item);
    setFollowUp({
      title: `Tindak lanjut: ${item.title}`,
      instructions: item.summary,
      priority: item.severity,
      dueAt: "",
    });
  };

  return (
    <main className={`${mobileDashboardMainClass} space-y-6`}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Exception Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-950">Review by Exception</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Fokus pada masalah operasional yang perlu tindakan, tanpa mewajibkan review manual untuk semua report.
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Buka Reports
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {([
          ["overdue", AlertTriangle],
          ["checklist_failed", XCircle],
          ["missing_evidence", CameraOff],
          ["rejected", ShieldAlert],
          ["low_compliance", ClipboardList],
        ] as const).map(([type, Icon]) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
            className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
              typeFilter === type ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-emerald-700" />
              <span className="text-2xl font-bold text-slate-950">{counts[type]}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">{typeLabels[type]}</p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari task, outlet, atau alasan exception..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as ExceptionType | "all")}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600"
          >
            <option value="all">Semua exception</option>
            {Object.entries(typeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {tasksQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Gagal memuat exception dashboard."}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-950">Exception Queue</p>
          <p className="mt-1 text-sm text-slate-500">
            Urutan berdasarkan severity agar masalah paling kritis muncul paling atas.
          </p>
        </div>

        {tasksQuery.isLoading ? (
          <div className="p-8 text-sm text-slate-500">Memuat exception...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <p className="mt-3 font-semibold text-slate-900">Tidak ada exception untuk filter ini.</p>
            <p className="mt-1 text-sm text-slate-500">Operasional terlihat bersih dari sinyal masalah utama.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs font-bold ${severityClass[item.severity]}`}>
                      {item.severity}
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      {typeLabels[item.type]}
                    </span>
                    {item.score != null ? (
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                        Score {item.score}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.outlet} • Due {formatDate(item.due)}
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-600">{item.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openFollowUp(item)}
                    disabled={!item.outletId}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <ClipboardPlus className="size-4" />
                    Buat Follow-Up
                  </button>
                  <Link
                    href={item.taskId ? "/dashboard/tasks" : "/dashboard/compliance"}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {item.taskId ? "Buka Task" : "Buka Compliance"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {followUpItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4">
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-emerald-700">Follow-Up Action</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{followUpItem.outlet}</h2>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setFollowUpItem(null)}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Judul
                <input
                  value={followUp.title}
                  onChange={(event) => setFollowUp({ ...followUp, title: event.target.value })}
                  className="min-h-11 rounded-lg border border-slate-300 px-3"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Instruksi
                <textarea
                  rows={4}
                  value={followUp.instructions}
                  onChange={(event) =>
                    setFollowUp({ ...followUp, instructions: event.target.value })
                  }
                  className="rounded-lg border border-slate-300 p-3"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Prioritas
                  <select
                    value={followUp.priority}
                    onChange={(event) =>
                      setFollowUp({
                        ...followUp,
                        priority: event.target.value as IncidentSeverity,
                      })
                    }
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  >
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Due
                  <input
                    type="datetime-local"
                    value={followUp.dueAt}
                    onChange={(event) => setFollowUp({ ...followUp, dueAt: event.target.value })}
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={!followUp.title.trim() || followUpMutation.isPending}
                onClick={() =>
                  followUpMutation.mutate({
                    incident_id: null,
                    outlet_id: followUpItem.outletId,
                    assignee_id: null,
                    title: followUp.title.trim(),
                    instructions: followUp.instructions.trim() || null,
                    priority: followUp.priority,
                    due_at: followUp.dueAt ? new Date(followUp.dueAt).toISOString() : null,
                    source_type: followUpItem.type,
                    source_id: followUpItem.taskId ?? followUpItem.id,
                  })
                }
                className="mt-2 min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Simpan Follow-Up
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
