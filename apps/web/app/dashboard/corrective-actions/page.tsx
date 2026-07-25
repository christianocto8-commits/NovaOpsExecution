"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { queryKeys } from "@/lib/query/keys";
import { taskService, type BackendTaskStatus } from "@/services/task.service";
import type { Task } from "@/features/tasks/types";
import { useLanguage } from "@/shared/i18n";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";
import { CorrectiveActionDetailDrawer } from "@/features/tasks/components/corrective-action-detail-drawer";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";

type StatusFilter = "all" | "open" | "in_progress" | "completed";

type Translate = (
  key: string,
  values?: Record<string, string | number>
) => string;

function getSlaLabel(task: Task, t: Translate) {
  if (task.backendStatus === "completed" || !task.due) return null;

  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return null;

  const diffMs = due.getTime() - Date.now();

  if (diffMs <= 0) {
    const overdueHours = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60));
    return {
      label:
        overdueHours <= 1
          ? t("capa.overdue")
          : t("capa.overdueHours", { hours: overdueHours }),
      tone: "overdue" as const,
    };
  }

  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hoursLeft >= 24) {
    const daysLeft = Math.ceil(hoursLeft / 24);
    return { label: t("capa.daysLeft", { days: daysLeft }), tone: "ok" as const };
  }

  if (hoursLeft < 4) {
    return {
      label:
        minutesLeft > 0
          ? t("capa.hoursMinutesLeft", { hours: hoursLeft, minutes: minutesLeft })
          : t("capa.hoursLeft", { hours: hoursLeft }),
      tone: "urgent" as const,
    };
  }

  return {
    label:
      minutesLeft > 0
        ? t("capa.hoursMinutesLeft", { hours: hoursLeft, minutes: minutesLeft })
        : t("capa.hoursLeft", { hours: hoursLeft }),
    tone: "ok" as const,
  };
}

function getWorkflowLabel(task: Task, t: Translate) {
  const status = task.backendStatus ?? "open";

  if (status === "completed") {
    return task.verifiedAt ? t("capa.verified") : t("capa.completed");
  }
  if (status === "in_progress") return t("capa.inProgress");
  if (status === "blocked") return t("capa.blocked");
  return t("capa.open");
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

function getReason(task: Task, t: Translate) {
  if (task.description?.includes("Failed items:")) {
    return task.description.split("Failed items:")[1]?.trim() || task.description;
  }
  return task.description || t("capa.defaultReason");
}

export default function CorrectiveActionsPage() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const capaEnabled = isCapaEnabled(settings);
  const queryClient = useQueryClient();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

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

  const verifyMutation = useMutation({
    mutationFn: (taskId: string) => taskService.verify(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "corrective-actions"] });
    },
  });

  const isManager = workspace.mode !== "outlet";

  const correctiveActions = useMemo(
    () => filterTasksForWorkspace(correctiveActionsQuery.data ?? [], workspace),
    [correctiveActionsQuery.data, workspace]
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
  const slaBreachedCount = correctiveActions.filter((task) => {
    if (nowMs == null) return false;
    if ((task.backendStatus ?? "open") === "completed" || !task.due) return false;
    const due = new Date(task.due);
    return !Number.isNaN(due.getTime()) && due.getTime() < nowMs;
  }).length;
  const escalationCandidates = correctiveActions.filter((task) => {
    if (nowMs == null) return false;
    const status = task.backendStatus ?? "open";
    if (status === "completed") return false;
    if (task.priority === "Critical") return true;
    if (!task.due) return false;
    const due = new Date(task.due);
    return !Number.isNaN(due.getTime()) && due.getTime() < nowMs;
  }).length;

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-red-700">{t("capa.eyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("capa.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("capa.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("capa.filterStatus")}
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">{t("capa.filterAll")}</option>
              <option value="open">{t("capa.filterOpen")}</option>
              <option value="in_progress">{t("capa.filterInProgress")}</option>
              <option value="completed">{t("capa.filterVerified")}</option>
            </select>
          </label>

          <Link
            href="/dashboard/compliance"
            className="rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-sm"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {t("capa.backCompliance")}
          </Link>
        </div>
      </div>

      {!capaEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t("capa.disabledTitle")}</p>
          <p className="mt-1 text-amber-800">{t("capa.disabledBody")}</p>
        </div>
      ) : null}

      {correctiveActionsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {correctiveActionsQuery.error instanceof Error
            ? correctiveActionsQuery.error.message
            : t("capa.loadError")}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("capa.open")}</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("capa.inProgress")}</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("capa.urgent")}</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{urgentCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{t("capa.verified")}</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{verifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">SLA breached</p>
          <p className="mt-2 text-3xl font-bold text-red-800">{slaBreachedCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm text-amber-700">Escalation candidates</p>
          <p className="mt-2 text-3xl font-bold text-amber-800">{escalationCandidates}</p>
        </div>
      </section>

      {correctiveActionsQuery.isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          {t("capa.loading")}
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-bold text-slate-800">{t("capa.emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("capa.emptyBody")}</p>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {filteredActions.map((task) => {
            const sla = getSlaLabel(task, t);
            const backendStatus = task.backendStatus ?? "open";

            return (
              <article
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedTask(task)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedTask(task);
                  }
                }}
                className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {t("capa.capaId", { id: task.id })}
                      {task.sourceId ? t("capa.sourceTask", { id: task.sourceId }) : ""}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-slate-950">{task.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.outlet} · {t("capa.dueLabel")} {task.due || "-"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        getWorkflowBadgeClass(task),
                      ].join(" ")}
                    >
                      {getWorkflowLabel(task, t)}
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
                        {t("capa.slaPrefix")} {sla.label}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("capa.statusLabel")}</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{getWorkflowLabel(task, t)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("capa.urgencyLabel")}</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{task.priority}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{t("capa.assigneeLabel")}</p>
                    <p className="mt-1 text-sm font-bold text-slate-950">{task.assignee}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                    {t("capa.actionRequired")}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-800">
                    {getReason(task, t)}
                  </p>
                </div>

                {backendStatus === "open" ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      statusMutation.mutate({ taskId: task.id, status: "in_progress" });
                    }}
                    disabled={statusMutation.isPending}
                    className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    {statusMutation.isPending ? t("capa.updating") : t("capa.startFix")}
                  </button>
                ) : null}

                {backendStatus === "in_progress" ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      statusMutation.mutate({ taskId: task.id, status: "completed" });
                    }}
                    disabled={statusMutation.isPending}
                    className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    {statusMutation.isPending ? t("capa.updating") : t("capa.completeFix")}
                  </button>
                ) : null}

                {backendStatus === "completed" && isManager && !task.verifiedAt ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      verifyMutation.mutate(task.id);
                    }}
                    disabled={verifyMutation.isPending}
                    className="mt-5 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    {verifyMutation.isPending ? t("capa.verifying") : t("capa.managerVerify")}
                  </button>
                ) : null}

                {task.verifiedAt ? (
                  <p className="mt-4 text-xs text-emerald-700">
                    {t("capa.verifiedAt", {
                      date: new Date(task.verifiedAt).toLocaleString("id-ID"),
                    })}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      <CorrectiveActionDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </main>
  );
}
