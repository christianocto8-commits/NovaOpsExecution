"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import { type ChangeEvent, useEffect, useState, useSyncExternalStore } from "react";

import type { Task } from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { taskService, type BackendTaskStatus } from "@/services/task.service";
import { uploadEvidenceFile } from "@/shared/evidence/upload-evidence";
import { useLanguage } from "@/shared/i18n";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { useToast } from "@/shared/toast";

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
  const toast = useToast();
  const queryClient = useQueryClient();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isManager = workspace.mode !== "outlet";
  const [rootCauseInput, setRootCauseInput] = useState("");
  const [beforeEvidenceUrl, setBeforeEvidenceUrl] = useState("");
  const [afterEvidenceUrl, setAfterEvidenceUrl] = useState("");
  const [capaNote, setCapaNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<"before" | "after" | null>(null);

  useEffect(() => {
    if (!task) return;
    setRootCauseInput(task.capaRootCause ?? "");
    setBeforeEvidenceUrl(task.capaBeforeEvidenceUrl ?? "");
    setAfterEvidenceUrl(task.capaAfterEvidenceUrl ?? "");
    setCapaNote(task.capaEvidenceNote ?? "");
    setRejectReason("");
  }, [task]);

  const invalidateCapa = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.sop.tasks(), "corrective-actions"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: BackendTaskStatus }) =>
      taskService.updateStatus(taskId, status),
    onSuccess: () => {
      invalidateCapa();
      toast.success("Status CAPA diperbarui.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status.");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (taskId: string) => taskService.verify(taskId),
    onSuccess: () => {
      invalidateCapa();
      toast.success("CAPA diverifikasi.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal verifikasi CAPA.");
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: (taskId: string) =>
      taskService.updateCorrectiveActionEvidence(taskId, {
        root_cause: rootCauseInput.trim() || null,
        before_evidence_url: beforeEvidenceUrl.trim() || null,
        after_evidence_url: afterEvidenceUrl.trim() || null,
        note: capaNote.trim() || null,
      }),
    onSuccess: () => {
      invalidateCapa();
      toast.success("Bukti CAPA disimpan.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan bukti.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (taskId: string) => taskService.rejectCorrectiveAction(taskId, rejectReason.trim()),
    onSuccess: () => {
      setRejectReason("");
      invalidateCapa();
      toast.success("CAPA dikembalikan untuk diperbaiki.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal reject CAPA.");
    },
  });

  if (!task) return null;

  const backendStatus = task.backendStatus ?? "open";
  const reason = getReason(task);

  async function uploadCapaEvidence(
    event: ChangeEvent<HTMLInputElement>,
    slot: "before" | "after"
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSlot(slot);
    try {
      const uploaded = await uploadEvidenceFile(file);
      if (slot === "before") {
        setBeforeEvidenceUrl(uploaded.url);
      } else {
        setAfterEvidenceUrl(uploaded.url);
      }
      toast.success(slot === "before" ? "Foto sebelum tersimpan." : "Foto sesudah tersimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload foto gagal.");
    } finally {
      setUploadingSlot(null);
      event.target.value = "";
    }
  }

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
              {task.outlet}
              {task.due ? ` · ${t("capa.dueLabel")} ${task.due}` : ""}
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
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              {t("capa.actionRequired")}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-red-800">
              {reason || t("capa.defaultReason")}
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

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-950">Bukti perbaikan</p>
            <p className="mt-1 text-xs text-slate-500">
              Upload foto sebelum & sesudah, lalu simpan sebelum minta verifikasi.
            </p>

            <div className="mt-3 grid gap-3">
              <select
                value={rootCauseInput}
                onChange={(event) => setRootCauseInput(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">Penyebab (opsional)</option>
                <option>Equipment / cold chain</option>
                <option>Evidence quality</option>
                <option>Cleaning / hygiene</option>
                <option>Inventory / product</option>
                <option>Process adherence</option>
                <option>Staff training</option>
              </select>

              <label className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700">
                {uploadingSlot === "before"
                  ? "Uploading..."
                  : beforeEvidenceUrl
                    ? "Ganti foto sebelum"
                    : "Upload foto sebelum"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void uploadCapaEvidence(event, "before")}
                  className="sr-only"
                />
              </label>
              {beforeEvidenceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={beforeEvidenceUrl}
                  alt="Before evidence"
                  className="h-36 w-full rounded-xl object-cover"
                />
              ) : null}

              <label className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700">
                {uploadingSlot === "after"
                  ? "Uploading..."
                  : afterEvidenceUrl
                    ? "Ganti foto sesudah"
                    : "Upload foto sesudah"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void uploadCapaEvidence(event, "after")}
                  className="sr-only"
                />
              </label>
              {afterEvidenceUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={afterEvidenceUrl}
                  alt="After evidence"
                  className="h-36 w-full rounded-xl object-cover"
                />
              ) : null}

              <textarea
                value={capaNote}
                onChange={(event) => setCapaNote(event.target.value)}
                placeholder="Catatan perbaikan (opsional)"
                rows={3}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />

              <button
                type="button"
                onClick={() => evidenceMutation.mutate(task.id)}
                disabled={evidenceMutation.isPending}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-300"
              >
                {evidenceMutation.isPending ? "Menyimpan..." : "Simpan bukti"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-5 py-4">
          {backendStatus === "open" ? (
            <button
              type="button"
              onClick={() => statusMutation.mutate({ taskId: task.id, status: "in_progress" })}
              disabled={statusMutation.isPending}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {statusMutation.isPending ? t("capa.updating") : t("capa.startFix")}
            </button>
          ) : null}

          {backendStatus === "in_progress" ? (
            <button
              type="button"
              onClick={() => statusMutation.mutate({ taskId: task.id, status: "completed" })}
              disabled={statusMutation.isPending}
              className="flex w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {statusMutation.isPending ? t("capa.updating") : t("capa.completeFix")}
            </button>
          ) : null}

          {backendStatus === "completed" && isManager && !task.verifiedAt ? (
            <>
              <button
                type="button"
                onClick={() => verifyMutation.mutate(task.id)}
                disabled={verifyMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <CheckCircle2 className="size-4" />
                {verifyMutation.isPending ? t("capa.verifying") : t("capa.managerVerify")}
              </button>
              <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                <textarea
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Alasan tolak / kerjakan ulang"
                  rows={2}
                  className="w-full rounded-xl border border-red-200 px-3 py-2 text-sm outline-none focus:border-red-400"
                />
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate(task.id)}
                  disabled={rejectMutation.isPending || !rejectReason.trim()}
                  className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-60"
                >
                  {rejectMutation.isPending ? "Mengembalikan..." : "Tolak & kerjakan ulang"}
                </button>
              </div>
            </>
          ) : null}

          {task.verifiedAt ? (
            <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              {t("capa.verifiedAt", {
                date: new Date(task.verifiedAt).toLocaleString("id-ID"),
              })}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
