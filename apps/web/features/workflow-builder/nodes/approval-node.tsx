"use client";

import {
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";

import type { WorkflowBuilderNode } from "@/features/workflow-builder/types/builder";

const approvalModeLabel = {
  single: "Single approver",
  any: "Any approver",
  all: "All approvers",
  sequential: "Sequential",
};

export function ApprovalNode({
  data,
  selected,
}: NodeProps<WorkflowBuilderNode>) {
  const configuration = data.approval ?? {
    approverType: "role" as const,
    approverLabel: "Approval role not configured",
    approvalMode: "single" as const,
    slaHours: null,
  };

  return (
    <div
      className={[
        "w-64 rounded-2xl border bg-white shadow-sm transition",
        selected
          ? "border-blue-600 ring-4 ring-blue-100"
          : "border-blue-200",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-white !bg-blue-600"
      />

      <div className="flex items-start justify-between border-b border-blue-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ShieldCheck className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Approval
            </p>

            <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">
              {data.label}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
          Pending
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        {data.description ? (
          <p className="text-xs leading-5 text-slate-500">
            {data.description}
          </p>
        ) : null}

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0 text-slate-500" />

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Approver
              </p>

              <p className="truncate text-xs font-semibold text-slate-700">
                {configuration.approverLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <CheckCircle2 className="size-3.5 text-blue-600" />
            {approvalModeLabel[configuration.approvalMode]}
          </span>

          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <Clock3 className="size-3.5 text-amber-600" />
            {configuration.slaHours
              ? `${configuration.slaHours}h SLA`
              : "No SLA"}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-white !bg-blue-600"
      />
    </div>
  );
}
