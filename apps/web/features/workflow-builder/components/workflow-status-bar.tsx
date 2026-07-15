"use client";

import {
  CircleAlert,
  GitBranch,
  Network,
  Save,
} from "lucide-react";

import { useWorkflowBuilder } from "@/features/workflow-builder/hooks/use-workflow-builder";

export function WorkflowStatusBar() {
  const {
    nodes,
    edges,
    isDirty,
    connectionMessage,
  } = useWorkflowBuilder();

  return (
    <footer className="flex min-h-9 items-center justify-between border-t border-slate-200 bg-white px-4 text-xs text-slate-500">
      <div className="flex items-center gap-5">
        <span className="inline-flex items-center gap-1.5">
          <Network className="size-3.5" />
          {nodes.length} nodes
        </span>

        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3.5" />
          {edges.length} connections
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Save className="size-3.5" />
          {isDirty ? "Draft modified" : "Draft saved"}
        </span>
      </div>

      {connectionMessage ? (
        <div className="inline-flex items-center gap-1.5 text-amber-700">
          <CircleAlert className="size-3.5" />
          {connectionMessage}
        </div>
      ) : (
        <span>Snap grid: 20 × 20</span>
      )}
    </footer>
  );
}
