"use client";

import {
  Bell,
  Check,
  ClipboardCheck,
  Clock3,
  FileText,
  GitBranch,
  TriangleAlert,
} from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { WorkflowBuilderNode } from "@/features/workflow-builder/types/builder";

const iconByNodeType = {
  approval: Check,
  condition: GitBranch,
  notification: Bell,
  escalation: TriangleAlert,
  delay: Clock3,
  task: ClipboardCheck,
  form: FileText,
};

const nodeStyleByType = {
  approval: {
    border: "border-blue-200",
    selected: "border-blue-600 ring-blue-100",
    icon: "bg-blue-100 text-blue-700",
    label: "text-blue-700",
    handle: "!bg-blue-600",
  },
  condition: {
    border: "border-violet-200",
    selected: "border-violet-600 ring-violet-100",
    icon: "bg-violet-100 text-violet-700",
    label: "text-violet-700",
    handle: "!bg-violet-600",
  },
  notification: {
    border: "border-cyan-200",
    selected: "border-cyan-600 ring-cyan-100",
    icon: "bg-cyan-100 text-cyan-700",
    label: "text-cyan-700",
    handle: "!bg-cyan-600",
  },
  escalation: {
    border: "border-orange-200",
    selected: "border-orange-600 ring-orange-100",
    icon: "bg-orange-100 text-orange-700",
    label: "text-orange-700",
    handle: "!bg-orange-600",
  },
  delay: {
    border: "border-amber-200",
    selected: "border-amber-600 ring-amber-100",
    icon: "bg-amber-100 text-amber-700",
    label: "text-amber-700",
    handle: "!bg-amber-600",
  },
  task: {
    border: "border-emerald-200",
    selected: "border-emerald-600 ring-emerald-100",
    icon: "bg-emerald-100 text-emerald-700",
    label: "text-emerald-700",
    handle: "!bg-emerald-600",
  },
  form: {
    border: "border-pink-200",
    selected: "border-pink-600 ring-pink-100",
    icon: "bg-pink-100 text-pink-700",
    label: "text-pink-700",
    handle: "!bg-pink-600",
  },
};

export function WorkflowStepNode({
  data,
  selected,
}: NodeProps<WorkflowBuilderNode>) {
  if (data.nodeType === "start" || data.nodeType === "end") {
    return null;
  }

  const Icon = iconByNodeType[data.nodeType];
  const style = nodeStyleByType[data.nodeType];

  return (
    <div
      className={[
        "min-w-56 rounded-2xl border bg-white px-4 py-3 shadow-sm transition",
        selected
          ? `${style.selected} ring-4`
          : style.border,
      ].join(" ")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={[
          "!size-3 !border-2 !border-white",
          style.handle,
        ].join(" ")}
      />

      <div className="flex items-center gap-3">
        <div
          className={[
            "flex size-10 items-center justify-center rounded-xl",
            style.icon,
          ].join(" ")}
        >
          <Icon className="size-5" />
        </div>

        <div className="min-w-0">
          <p
            className={[
              "text-xs font-semibold uppercase tracking-[0.16em]",
              style.label,
            ].join(" ")}
          >
            {data.nodeType}
          </p>

          <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">
            {data.label}
          </p>
        </div>
      </div>

      {data.description ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          {data.description}
        </p>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className={[
          "!size-3 !border-2 !border-white",
          style.handle,
        ].join(" ")}
      />
    </div>
  );
}
