"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { ChecklistScore } from "@/features/tasks/types";
import { Modal } from "@/shared/ui/overlay/modal";

type ChecklistSubmitResultModalProps = {
  open: boolean;
  taskTitle: string;
  checklist: ChecklistScore | null;
  pendingSync?: boolean;
  isSyncing?: boolean;
  correctiveActionId?: string;
  capaEnabled?: boolean;
  onClose: () => void;
};

function getStatusMeta(status: ChecklistScore["status"], capaEnabled: boolean) {
  if (status === "pass") {
    return {
      title: "Checklist Lulus",
      description: "Semua item scorable memenuhi standar operasional.",
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  }

  if (status === "attention") {
    return {
      title: "Perlu Perhatian",
      description: "Checklist selesai, namun ada item yang perlu ditindaklanjuti.",
      icon: AlertTriangle,
      iconClass: "text-amber-600",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-100",
    };
  }

  return {
    title: "Checklist Gagal",
    description: capaEnabled
      ? "Beberapa item gagal. Corrective action mungkin dibuat otomatis."
      : "Beberapa item gagal. Perbaikan perlu ditindaklanjuti manual.",
    icon: XCircle,
    iconClass: "text-red-600",
    badgeClass: "bg-red-50 text-red-700 border-red-100",
  };
}

export function ChecklistSubmitResultModal({
  open,
  taskTitle,
  checklist,
  pendingSync = false,
  isSyncing = false,
  correctiveActionId,
  capaEnabled = true,
  onClose,
}: ChecklistSubmitResultModalProps) {
  if (!checklist) return null;

  const meta = getStatusMeta(checklist.status, capaEnabled);
  const StatusIcon = meta.icon;
  const criticalFailures =
    checklist.critical_failures && checklist.critical_failures.length > 0
      ? checklist.critical_failures
      : checklist.failed_items.filter((item) => item.critical);

  return (
    <Modal
      open={open}
      title={meta.title}
      description={`${taskTitle} · Skor ${checklist.score}%`}
      onClose={onClose}
      size="md"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Tutup
        </button>
      }
    >
      <div className="space-y-5">
        {isSyncing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Menyimpan ke server… Skor ditampilkan langsung; CAPA muncul setelah sync selesai.
          </div>
        ) : null}

        {pendingSync ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Tersimpan offline — menunggu sinkron. Skor di bawah bersifat perkiraan.
          </div>
        ) : null}

        {capaEnabled && correctiveActionId && !pendingSync && !isSyncing ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">Corrective action (CAPA) dibuat</p>
            <p className="mt-1 text-sm text-emerald-800">
              Tindak lanjut otomatis telah dibuat dari item checklist yang gagal.
            </p>
            <Link
              href="/dashboard/corrective-actions"
              className="mt-3 inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Lihat corrective actions
            </Link>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <StatusIcon className={`mt-0.5 size-5 shrink-0 ${meta.iconClass}`} />
          <div>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${meta.badgeClass}`}
            >
              {checklist.status}
            </span>
            <p className="mt-2 text-sm leading-6 text-slate-600">{meta.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">Skor</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{checklist.score}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-xs text-emerald-700">Lulus</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{checklist.passed_count}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 text-center">
            <p className="text-xs text-red-700">Gagal</p>
            <p className="mt-1 text-2xl font-bold text-red-800">{checklist.failed_count}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-4 text-center">
            <p className="text-xs text-slate-500">N/A</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{checklist.na_count ?? 0}</p>
          </div>
        </div>

        {criticalFailures.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Item Kritis Gagal
            </p>
            {criticalFailures.map((item) => (
              <div
                key={`critical-${item.field_id}-${item.label}`}
                className="rounded-2xl border-2 border-red-300 bg-red-100 p-4"
              >
                <p className="font-bold text-red-950">{item.label}</p>
                <p className="mt-1 text-sm text-red-800">Nilai: {item.value || "-"}</p>
                <p className="mt-1 text-sm font-semibold text-red-700">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : null}

        {checklist.failed_items.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Item Gagal
            </p>
            {checklist.failed_items.map((item) => (
              <div
                key={`${item.field_id}-${item.label}`}
                className={`rounded-2xl border p-4 ${
                  item.critical
                    ? "border-red-200 bg-red-50"
                    : "border-red-100 bg-red-50/70"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-red-950">{item.label}</p>
                  {item.critical ? (
                    <span className="rounded-full bg-red-200 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                      Kritis
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-red-800">Nilai: {item.value || "-"}</p>
                <p className="mt-1 text-sm text-red-700">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-700">Tidak ada item yang gagal.</p>
        )}
      </div>
    </Modal>
  );
}
