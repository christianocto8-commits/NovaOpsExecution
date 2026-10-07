"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock3, AlertTriangle, Printer, X, ShieldCheck } from "lucide-react";
import type { Task } from "@/features/tasks/types";
import { isTaskCompleted } from "@/features/tasks/utils/task-inbox";

type ShiftHandoverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  outletName?: string;
};

function isDueToday(task: Task) {
  if (!task.due) return false;
  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function isOverdue(task: Task) {
  if (!task.due || isTaskCompleted(task)) return false;
  const due = new Date(task.due);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function formatTime(isoString?: string) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ShiftHandoverModal({
  isOpen,
  onClose,
  tasks,
  outletName,
}: ShiftHandoverModalProps) {
  const todayDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const stats = useMemo(() => {
    const todayTasks = tasks.filter(isDueToday);
    const completedTasks = tasks.filter((t) => isTaskCompleted(t) && isDueToday(t));
    const pendingTasks = todayTasks.filter((t) => !isTaskCompleted(t));
    const overdueTasks = tasks.filter(isOverdue);

    const total = todayTasks.length;
    const rate = total > 0 ? Math.round((completedTasks.length / total) * 100) : 100;

    return {
      todayTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      rate,
    };
  }, [tasks]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl print:border-none print:shadow-none print:max-h-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-900 to-slate-900 px-6 py-5 text-white print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 print:border print:border-emerald-600 print:text-emerald-800">
                <ShieldCheck className="size-3.5" />
                Shift Handover Log
              </span>
              <span className="text-xs text-slate-300 print:text-slate-600">{todayDateLabel}</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white print:text-slate-950">
              {outletName ?? "Gerai Operasional"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 print:hidden"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-slate-800">
          {/* Metrik Ringkasan */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total SOP Hari Ini
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">{stats.todayTasks.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Selesai
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-900">
                {stats.completedTasks.length} ({stats.rate}%)
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Belum Selesai
              </p>
              <p className="mt-1 text-2xl font-black text-amber-900">
                {stats.pendingTasks.length}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                Overdue
              </p>
              <p className="mt-1 text-2xl font-black text-red-900">
                {stats.overdueTasks.length}
              </p>
            </div>
          </div>

          {/* Section: Tugas Selesai */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Tugas Selesai ({stats.completedTasks.length})
            </h3>
            {stats.completedTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                Belum ada checklist yang diselesaikan hari ini.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white">
                {stats.completedTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{task.title}</p>
                      <p className="text-slate-500">
                        Oleh: {task.execution?.operatorName || task.assignee || "Crew Gerai"}
                        {task.execution?.completedAt
                          ? ` · Selesai pukul ${formatTime(task.execution.completedAt)}`
                          : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      ✓ Done
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Section: Tugas Pending untuk Shift Selanjutnya */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900">
              <Clock3 className="size-4 text-amber-600" />
              Pending / Handover ke Shift Berikutnya ({stats.pendingTasks.length})
            </h3>
            {stats.pendingTasks.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center text-xs font-semibold text-emerald-800">
                🎉 Luar biasa! Semua tugas shift hari ini telah selesai 100%.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white">
                {stats.pendingTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{task.title}</p>
                      <p className="text-slate-500">
                        Jatuh tempo: {task.due ? formatTime(task.due) : "Hari Ini"}
                        {task.priority ? ` · Prioritas: ${task.priority}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      Pending
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="size-4 text-slate-500" />
            Cetak Log Handover
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
