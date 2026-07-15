"use client";

import type { DragEvent } from "react";
import {
  Bell,
  Check,
  ClipboardCheck,
  Clock3,
  FileText,
  GitBranch,
  Play,
  Square,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import {
  WORKFLOW_NODE_DRAG_TYPE,
  workflowNodeRegistry,
  type WorkflowNodeRegistryItem,
} from "@/features/workflow-builder/registry/node-registry";

const iconMap: Record<WorkflowNodeRegistryItem["icon"], LucideIcon> = {
  play: Play,
  square: Square,
  check: Check,
  gitBranch: GitBranch,
  bell: Bell,
  triangleAlert: TriangleAlert,
  clock: Clock3,
  clipboardCheck: ClipboardCheck,
  fileText: FileText,
};

const groups = [
  {
    id: "flow",
    label: "Flow",
  },
  {
    id: "action",
    label: "Actions",
  },
  {
    id: "logic",
    label: "Logic",
  },
] as const;

export function WorkflowToolbox() {
  function handleDragStart(
    event: DragEvent<HTMLButtonElement>,
    item: WorkflowNodeRegistryItem
  ) {
    event.dataTransfer.setData(WORKFLOW_NODE_DRAG_TYPE, item.type);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Toolbox
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Drag a node onto the workflow canvas.
        </p>
      </div>

      <div className="mt-5 space-y-6">
        {groups.map((group) => {
          const items = workflowNodeRegistry.filter(
            (item) => item.group === group.id
          );

          return (
            <section key={group.id}>
              <p className="mb-2 text-xs font-semibold text-slate-700">
                {group.label}
              </p>

              <div className="space-y-2">
                {items.map((item) => {
                  const Icon = iconMap[item.icon];

                  return (
                    <button
                      key={item.type}
                      type="button"
                      draggable
                      onDragStart={(event) =>
                        handleDragStart(event, item)
                      }
                      className="group flex w-full cursor-grab items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 active:cursor-grabbing"
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-emerald-700">
                        <Icon className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-xs leading-4 text-slate-500">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
