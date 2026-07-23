"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import type { FormTemplate } from "@/features/forms/types";
import type { Task } from "@/features/tasks/types";
import { isTaskWorkedOn } from "@/features/tasks/utils/task-inbox";
import {
  exportOutletWorkReportPdf,
  exportSingleTaskWorkReportPdf,
} from "@/features/reports/utils/task-work-report-pdf";

type TaskPdfExportButtonProps = {
  task: Task;
  templates: FormTemplate[];
  variant?: "primary" | "outline";
  label?: string;
  className?: string;
};

export function TaskPdfExportButton({
  task,
  templates,
  variant = "outline",
  label = "Export PDF",
  className = "",
}: TaskPdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!isTaskWorkedOn(task)) return null;

  async function handleExport() {
    try {
      setIsExporting(true);
      await exportSingleTaskWorkReportPdf(task, templates);
    } finally {
      setIsExporting(false);
    }
  }

  const baseClass =
    variant === "primary"
      ? "bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-slate-300"
      : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <button
      type="button"
      disabled={isExporting}
      onClick={() => void handleExport()}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold disabled:cursor-not-allowed ${baseClass} ${className}`}
    >
      <Download className="size-4" />
      {isExporting ? "Menyiapkan..." : label}
    </button>
  );
}

type OutletWorkedTasksPdfExportButtonProps = {
  outlet: string;
  tasks: Task[];
  templates: FormTemplate[];
  subtitle?: string;
  label?: string;
  className?: string;
};

export function OutletWorkedTasksPdfExportButton({
  outlet,
  tasks,
  templates,
  subtitle,
  label = "Export PDF",
  className = "",
}: OutletWorkedTasksPdfExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const workedCount = tasks.filter((task) => task.outlet === outlet && isTaskWorkedOn(task)).length;

  if (workedCount === 0) return null;

  async function handleExport() {
    try {
      setIsExporting(true);
      await exportOutletWorkReportPdf({
        outlet,
        tasks,
        templates,
        subtitle: subtitle ?? `${workedCount} task selesai`,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isExporting}
      onClick={() => void handleExport()}
      className={`inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 ${className}`}
    >
      <Download className="size-4" />
      {isExporting ? "Menyiapkan PDF..." : label}
    </button>
  );
}
