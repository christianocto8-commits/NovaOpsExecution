"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CorrectiveActionDetailDrawer } from "@/features/tasks/components/corrective-action-detail-drawer";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { taskService, type BackendTaskStatus } from "@/services/task.service";
import { useLanguage } from "@/shared/i18n";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { filterTasksForWorkspace } from "@/shared/navigation/outlet-scope";

type StatusFilter = "all" | "open" | "in_progress" | "completed";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function getReason(task: Task, t: Translate) {
  if (task.description?.includes("Failed items:")) {
    return task.description.split("Failed items:")[1]?.trim() || task.description;
  }
  return task.description || t("capa.defaultReason");
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

  if (status === "completed") return "bg-emerald-50 text-emerald-800";
  if (status === "in_progress") return "bg-blue-50 text-blue-800";
  if (status === "blocked") return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-800";
}

function getDueLabel(task: Task, t: Translate) {
  if (task.backendStatus === "completed" || !task.due) return null;

  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return null;

  const diffMs = due.getTime() - Date.now();
  if (diffMs <= 0) return { label: t("capa.overdue"), tone: "overdue" as const };

  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  if (hoursLeft < 4) {
    return {
      label: t("capa.hoursLeft", { hours: Math.max(hoursLeft, 1) }),
      tone: "urgent" as const,
    };
  }
  if (hoursLeft >= 24) {
    return { label: t("capa.daysLeft", { days: Math.ceil(hoursLeft / 24) }), tone: "ok" as const };
  }
  return { label: t("capa.hoursLeft", { hours: hoursLeft }), tone: "ok" as const };
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const correctiveActionsQuery = useQuery({
    queryKey: [...queryKeys.sop.tasks(), "corrective-actions"],
    queryFn: () => taskService.listCorrectiveActions(),
    retry: false,
  });

  const invalidateCapa = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "corrective-actions"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: BackendTaskStatus }) =>
      taskService.updateStatus(taskId, status),
    onSuccess: invalidateCapa,
  });

  const verifyMutation = useMutation({
    mutationFn: (taskId: string) => taskService.verify(taskId),
    onSuccess: invalidateCapa,
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

  const selectedTask = correctiveActions.find((task) => task.id === selectedTaskId) ?? null;

  const openCount = correctiveActions.filter((task) => task.backendStatus === "open").length;
  const inProgressCount = correctiveActions.filter(
    (task) => task.backendStatus === "in_progress"
  ).length;
  const doneCount = correctiveActions.filter((task) => task.backendStatus === "completed").length;

  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: t("capa.filterAll") },
    { id: "open", label: t("capa.filterOpen") },
    { id: "in_progress", label: t("capa.filterInProgress") },
    { id: "completed", label: t("capa.filterVerified") },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-red-700">{t("capa.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("capa.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("capa.subtitle")}</p>
      </div>

      {!capaEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t("capa.disabledTitle")}</p>
          <p className="mt-1 text-amber-800">{t("capa.disabledBody")}</p>
          <Link
            href="/dashboard/settings"
            className="mt-3 inline-flex text-sm font-bold text-amber-900 underline"
          >
            Settings
          </Link>
        </div>
      ) : null}

      {correctiveActionsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {correctiveActionsQuery.error instanceof Error
            ? correctiveActionsQuery.error.message
            : t("capa.loadError")}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t("capa.open")}</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t("capa.inProgress")}</p>
          <p className="mt-1 text-2xl font-semibold text-blue-700">{inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t("capa.completed")}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{doneCount}</p>
        </div>
      </div>

      <div className="inline-flex w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {filters.map((filter) => {
          const isActive = statusFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                isActive ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {correctiveActionsQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          {t("capa.loading")}
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
          <p className="font-semibold text-slate-800">{t("capa.emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("capa.emptyBody")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
          {filteredActions.map((task) => {
            const backendStatus = task.backendStatus ?? "open";
            const due = getDueLabel(task, t);
            const reason = getReason(task, t);

            return (
              <li key={task.id}>
                <div className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {task.outlet}
                        {due ? ` · ${due.label}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{reason}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${getWorkflowBadgeClass(task)}`}
                    >
                      {getWorkflowLabel(task, t)}
                    </span>
                  </button>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {backendStatus === "open" ? (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ taskId: task.id, status: "in_progress" })
                        }
                        disabled={statusMutation.isPending}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {statusMutation.isPending ? t("capa.updating") : t("capa.startFix")}
                      </button>
                    ) : null}

                    {backendStatus === "in_progress" ? (
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({ taskId: task.id, status: "completed" })
                        }
                        disabled={statusMutation.isPending}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {statusMutation.isPending ? t("capa.updating") : t("capa.completeFix")}
                      </button>
                    ) : null}

                    {backendStatus === "completed" && isManager && !task.verifiedAt ? (
                      <button
                        type="button"
                        onClick={() => verifyMutation.mutate(task.id)}
                        disabled={verifyMutation.isPending}
                        className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {verifyMutation.isPending ? t("capa.verifying") : t("capa.managerVerify")}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CorrectiveActionDetailDrawer task={selectedTask} onClose={() => setSelectedTaskId(null)} />
    </main>
  );
}
