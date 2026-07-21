"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { taskService, type BackendTaskStatus } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";

type StatusFilter = "all" | "open" | "in_progress" | "completed";

function getSlaLabel(task: Task) {
  if (task.backendStatus === "completed" || !task.due) return null;

  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return null;

  const diffMs = due.getTime() - Date.now();

  if (diffMs <= 0) {
    const overdueHours = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60));
    return {
      label: overdueHours <= 1 ? "Terlambat" : `${overdueHours}j terlambat`,
      tone: "overdue" as const,
    };
  }

  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursLeft >= 24) {
    const daysLeft = Math.ceil(hoursLeft / 24);
    return { label: `${daysLeft}h tersisa`, tone: "ok" as const };
  }

  if (hoursLeft < 4) {
    return {
      label: minutesLeft > 0 ? `${hoursLeft}j ${minutesLeft}m tersisa` : `${hoursLeft}j tersisa`,
      tone: "urgent" as const,
    };
  }

  return {
    label: minutesLeft > 0 ? `${hoursLeft}j ${minutesLeft}m tersisa` : `${hoursLeft}j tersisa`,
    tone: "ok" as const,
  };
}

function getWorkflowLabel(task: Task) {
  const status = task.backendStatus ?? "open";

  if (status === "completed") {
    return task.verifiedAt ? "Terverifikasi" : "Selesai";
  }
  if (status === "in_progress") return "Dalam Proses";
  if (status === "blocked") return "Terblokir";
  return "Open";
}

function getWorkflowBadgeClass(task: Task) {
  const status = task.backendStatus ?? "open";

  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "in_progress") {
    return "bg-blue-50 text-blue-700";
  }
  if (status === "blocked") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-red-50 text-red-700";
}

function getReason(task: Task) {
  if (task.description?.includes("Failed items:")) {
    return task.description.split("Failed items:")[1]?.trim() || task.description;
  }
  return task.description || "Tinjau corrective action dan verifikasi setelah perbaikan selesai.";
}

export default function CorrectiveActionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const correctiveActionsQuery = useQuery({
    queryKey: [...queryKeys.sop.tasks(), "corrective-actions"],
    queryFn: () => taskService.listCorrectiveActions(),
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: BackendTaskStatus }) =>
      taskService.updateStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "corrective-actions"] });
    },
  });

  const correctiveActions = useMemo(
    () => correctiveActionsQuery.data ?? [],
    [correctiveActionsQuery.data]
  );

  const filteredActions = useMemo(() => {
    if (statusFilter === "all") return correctiveActions;
    return correctiveActions.filter((task) => (task.backendStatus ?? "open") === statusFilter);
  }, [correctiveActions, statusFilter]);

  const openCount = correctiveActions.filter((task) => task.backendStatus === "open").length;
  const inProgressCount = correctiveActions.filter(
    (task) => task.backendStatus === "in_progress"
  ).length;
  const verifiedCount = correctiveActions.filter((task) => task.backendStatus === "completed").length;
  const urgentCount = correctiveActions.filter(
    (task) => task.priority === "Critical" && task.backendStatus !== "completed"
  ).length;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-red-700">Corrective Actions</p>
          <h1 className="text-2xl font-semibold text-slate-950">CAPA Follow-up Board</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Task perbaikan otomatis dari checklist gagal. Alur: Open → Dalam Proses → Terverifikasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Semua</option>
              <option value="open">Open</option>
              <option value="in_progress">Dalam Proses</option>
              <option value="completed">Terverifikasi</option>
            </select>
          </label>

          <Link
            href="/dashboard/compliance"
            className="rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Kembali ke Compliance
          </Link>
        </div>
      </div>

      {correctiveActionsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {correctiveActionsQuery.error instanceof Error
            ? correctiveActionsQuery.error.message
            : "Gagal memuat corrective actions."}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Open</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Dalam Proses</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Urgent</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{urgentCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Terverifikasi</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{verifiedCount}</p>
        </div>
      </section>

      {correctiveActionsQuery.isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Memuat corrective actions...
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-bold text-slate-800">Belum ada corrective action</p>
          <p className="mt-1 text-sm text-slate-500">
            Checklist gagal akan membuat task perbaikan terhubung di sini.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredActions.map((task) => {
            const sla = getSlaLabel(task);
            const backendStatus = task.backendStatus ?? "open";

            return (
              <article key={task.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      CAPA {task.id}
                      {task.sourceId ? ` · Sumber task ${task.sourceId}` : ""}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-950">{task.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.outlet} · Due {task.due || "-"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        getWorkflowBadgeClass(task),
                      ].join(" ")}
                    >
                      {getWorkflowLabel(task)}
                    </span>
                    {sla ? (
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          sla.tone === "overdue"
                            ? "bg-red-100 text-red-800"
                            : sla.tone === "urgent"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        SLA: {sla.label}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{getWorkflowLabel(task)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Urgency</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{task.priority}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Assignee</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{task.assignee}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    Tindakan Diperlukan
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-800">
                    {getReason(task)}
                  </p>
                </div>

                {backendStatus === "open" ? (
                  <button
                    type="button"
                    onClick={() =>
                      statusMutation.mutate({ taskId: task.id, status: "in_progress" })
                    }
                    disabled={statusMutation.isPending}
                    className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    {statusMutation.isPending ? "Memperbarui..." : "Mulai Perbaikan"}
                  </button>
                ) : null}

                {backendStatus === "in_progress" ? (
                  <button
                    type="button"
                    onClick={() => statusMutation.mutate({ taskId: task.id, status: "completed" })}
                    disabled={statusMutation.isPending}
                    className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    {statusMutation.isPending ? "Memverifikasi..." : "Verifikasi & Tutup"}
                  </button>
                ) : null}

                {task.verifiedAt ? (
                  <p className="mt-4 text-xs text-emerald-700">
                    Diverifikasi pada {new Date(task.verifiedAt).toLocaleString("id-ID")}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
