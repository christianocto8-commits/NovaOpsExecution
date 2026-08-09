"use client";

import { CircleAlert, Settings2 } from "lucide-react";

import { useWorkflowBuilder } from "@/features/workflow-builder/hooks/use-workflow-builder";

export function WorkflowProperties() {
  const { selectedNode, updateNodeData } = useWorkflowBuilder();

  if (!selectedNode) {
    return (
      <aside className="overflow-y-auto border-l border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Properties
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Settings2 className="size-4" />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-800">No node selected</p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Select a node on the canvas to configure its properties.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="overflow-y-auto border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Properties
        </p>

        <div className="mt-3">
          <p className="text-sm font-semibold text-slate-950">{selectedNode.data.label}</p>

          <p className="mt-1 text-xs capitalize text-slate-500">
            {selectedNode.data.nodeType} node
          </p>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <section>
          <label htmlFor="workflow-node-label" className="text-xs font-semibold text-slate-700">
            Name
          </label>

          <input
            id="workflow-node-label"
            type="text"
            value={selectedNode.data.label}
            onChange={(event) =>
              updateNodeData(selectedNode.id, {
                label: event.target.value,
              })
            }
            className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </section>

        <section>
          <label
            htmlFor="workflow-node-description"
            className="text-xs font-semibold text-slate-700"
          >
            Description
          </label>

          <textarea
            id="workflow-node-description"
            rows={4}
            value={selectedNode.data.description ?? ""}
            onChange={(event) =>
              updateNodeData(selectedNode.id, {
                description: event.target.value,
              })
            }
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </section>

        <section>
          <p className="text-xs font-semibold text-slate-700">Node type</p>

          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm font-medium capitalize text-slate-700">
              {selectedNode.data.nodeType}
            </p>
          </div>
        </section>

        {selectedNode.data.nodeType === "approval" ? (
          <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div>
              <p className="text-xs font-semibold text-blue-950">Approval configuration</p>
              <p className="mt-1 text-xs leading-5 text-blue-700">
                Basic approval fields are enabled for canvas testing.
              </p>
            </div>

            <div>
              <label
                htmlFor="approval-approver-label"
                className="text-xs font-semibold text-slate-700"
              >
                Approver
              </label>

              <input
                id="approval-approver-label"
                type="text"
                value={selectedNode.data.approval?.approverLabel ?? ""}
                onChange={(event) =>
                  updateNodeData(selectedNode.id, {
                    approval: {
                      approverType: selectedNode.data.approval?.approverType ?? "role",
                      approverLabel: event.target.value,
                      approvalMode: selectedNode.data.approval?.approvalMode ?? "single",
                      slaHours: selectedNode.data.approval?.slaHours ?? null,
                    },
                  })
                }
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="approval-mode" className="text-xs font-semibold text-slate-700">
                Approval mode
              </label>

              <select
                id="approval-mode"
                value={selectedNode.data.approval?.approvalMode ?? "single"}
                onChange={(event) =>
                  updateNodeData(selectedNode.id, {
                    approval: {
                      approverType: selectedNode.data.approval?.approverType ?? "role",
                      approverLabel: selectedNode.data.approval?.approverLabel ?? "Outlet Manager",
                      approvalMode: event.target.value as "single" | "any" | "all" | "sequential",
                      slaHours: selectedNode.data.approval?.slaHours ?? null,
                    },
                  })
                }
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="single">Single approver</option>
                <option value="any">Any approver</option>
                <option value="all">All approvers</option>
                <option value="sequential">Sequential</option>
              </select>
            </div>

            <div>
              <label htmlFor="approval-sla" className="text-xs font-semibold text-slate-700">
                SLA hours
              </label>

              <input
                id="approval-sla"
                type="number"
                min="1"
                value={selectedNode.data.approval?.slaHours ?? ""}
                onChange={(event) =>
                  updateNodeData(selectedNode.id, {
                    approval: {
                      approverType: selectedNode.data.approval?.approverType ?? "role",
                      approverLabel: selectedNode.data.approval?.approverLabel ?? "Outlet Manager",
                      approvalMode: selectedNode.data.approval?.approvalMode ?? "single",
                      slaHours: event.target.value ? Number(event.target.value) : null,
                    },
                  })
                }
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />

              <div>
                <p className="text-xs font-semibold text-amber-900">Configuration pending</p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  Type-specific configuration will be added in Sprint 09G.3.
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <p className="text-xs font-semibold text-slate-700">Node ID</p>

          <code className="mt-2 block break-all rounded-xl bg-slate-950 px-3 py-2 text-[11px] leading-5 text-slate-200">
            {selectedNode.id}
          </code>
        </section>
      </div>
    </aside>
  );
}
