"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import type { ChecklistScore } from "@/features/tasks/types";
import { Modal } from "@/shared/ui/overlay/modal";

type ChecklistSubmitResultModalProps = {
  open: boolean;
  taskTitle: string;
  checklist: ChecklistScore | null;
  onClose: () => void;
};

function getStatusMeta(status: ChecklistScore["status"]) {
  if (status === "pass") {
    return {
      title: "Checklist Passed",
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
    title: "Checklist Failed",
    description: "Beberapa item gagal. Corrective action mungkin dibuat otomatis.",
    icon: XCircle,
    iconClass: "text-red-600",
    badgeClass: "bg-red-50 text-red-700 border-red-100",
  };
}

export function ChecklistSubmitResultModal({
  open,
  taskTitle,
  checklist,
  onClose,
}: ChecklistSubmitResultModalProps) {
  if (!checklist) return null;

  const meta = getStatusMeta(checklist.status);
  const StatusIcon = meta.icon;

  return (
    <Modal
      open={open}
      title={meta.title}
      description={`${taskTitle} · Score ${checklist.score}%`}
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

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">Score</p>
            <p className="mt-1 text-2xl font-bold text-slate-950">{checklist.score}%</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <p className="text-xs text-emerald-700">Passed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">{checklist.passed_count}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-4 text-center">
            <p className="text-xs text-red-700">Failed</p>
            <p className="mt-1 text-2xl font-bold text-red-800">{checklist.failed_count}</p>
          </div>
        </div>

        {checklist.failed_items.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Failed Items
            </p>
            {checklist.failed_items.map((item) => (
              <div
                key={`${item.field_id}-${item.label}`}
                className="rounded-2xl border border-red-100 bg-red-50 p-4"
              >
                <p className="font-semibold text-red-950">{item.label}</p>
                <p className="mt-1 text-sm text-red-800">Value: {item.value || "-"}</p>
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
