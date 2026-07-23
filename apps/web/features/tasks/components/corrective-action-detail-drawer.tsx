"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, User, X } from "lucide-react";

import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { taskService } from "@/services/task.service";
import { useLanguage } from "@/shared/i18n";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { useSyncExternalStore } from "react";

type CorrectiveActionDetailDrawerProps = {
  task: Task | null;
  onClose: () => void;
};

function getReason(task: Task) {
  if (task.description?.includes("Failed items:")) {
    return task.description.split("Failed items:")[1]?.trim() || task.description;
  }
  return task.description ?? "";
}

export function CorrectiveActionDetailDrawer({ task, onClose }: CorrectiveActionDetailDrawerProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isManager = workspace.mode !== "outlet";

  const verifyMutation = useMutation({
    mutationFn: (taskId: string) => taskService.verify(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "corrective-actions"] });
    },
  });

  if (!task) return null;

  const backendStatus = task.backendStatus ?? "open";
  const verificationStatus = task.verifiedAt
    ? "verified"
    : backendStatus === "completed"
      ? "awaiting_verification"
      : backendStatus;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-red-600">
              {t("capa.eyebrow")}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{task.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {task.outlet} · {t("capa.dueLabel")} {task.due || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {t("capa.verificationStatus")}: {String(verificationStatus)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <User className="size-3" />
              {task.assignee || t("capa.unassigned")}
            </span>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              {t("capa.actionRequired")}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-800">
              {getReason(task) || t("capa.defaultReason")}
            </p>
          </div>

          {task.sourceId ? (
            <Link
              href={`/dashboard/tasks?taskId=${task.sourceId}`}
              onClick={onClose}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              <span>{t("capa.viewSourceTask", { id: task.sourceId })}</span>
              <span className="text-xs text-slate-500">→</span>
            </Link>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          {backendStatus !== "completed" ? (
            <Link
              href={`/dashboard/tasks?taskId=${task.id}`}
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
            >
              {t("capa.completeFix")}
            </Link>
          ) : isManager && !task.verifiedAt ? (
            <button
              type="button"
              onClick={() => verifyMutation.mutate(task.id)}
              disabled={verifyMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              <CheckCircle2 className="size-4" />
              {verifyMutation.isPending ? t("capa.verifying") : t("capa.managerVerify")}
            </button>
          ) : (
            <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              {t("capa.verified")}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
