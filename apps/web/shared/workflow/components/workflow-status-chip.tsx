"use client";

import { WorkflowStatus } from "../types/workflow";
import { getWorkflowStatusMeta } from "../utils/workflow";

interface WorkflowStatusChipProps {
  status?: WorkflowStatus;
}

const toneClassName: Record<string, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  danger: "border-red-100 bg-red-50 text-red-700",
  purple: "border-violet-100 bg-violet-50 text-violet-700",
};

export function WorkflowStatusChip({ status }: WorkflowStatusChipProps) {
  if (!status) return null;

  const meta = getWorkflowStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClassName[meta.tone]}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
