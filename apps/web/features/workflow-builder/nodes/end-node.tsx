"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Square } from "lucide-react";

import type { WorkflowBuilderNode } from "@/features/workflow-builder/types/builder";

export function EndNode({ data, selected }: NodeProps<WorkflowBuilderNode>) {
  return (
    <div
      className={[
        "min-w-52 rounded-2xl border bg-white px-4 py-3 shadow-sm transition",
        selected
          ? "border-slate-700 ring-4 ring-slate-200"
          : "border-slate-300",
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-white !bg-slate-700"
      />

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Square className="size-5" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            End
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-950">
            {data.label}
          </p>
        </div>
      </div>

      {data.description ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {data.description}
        </p>
      ) : null}
    </div>
  );
}
