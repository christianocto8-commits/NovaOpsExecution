"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

import type { WorkflowBuilderNode } from "@/features/workflow-builder/types/builder";

export function StartNode({ data, selected }: NodeProps<WorkflowBuilderNode>) {
  return (
    <div
      className={[
        "min-w-52 rounded-2xl border bg-white px-4 py-3 shadow-sm transition",
        selected ? "border-emerald-600 ring-4 ring-emerald-100" : "border-emerald-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Play className="size-5" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Start
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-950">{data.label}</p>
        </div>
      </div>

      {data.description ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">{data.description}</p>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-white !bg-emerald-600"
      />
    </div>
  );
}
