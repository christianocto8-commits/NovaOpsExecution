import type { WorkflowDefinition } from "@/features/workflows/types";
import { formatWorkflowDate, getWorkflowStatusTone } from "@/features/workflows/utils";
import { ApprovalMatrixPanel } from "./approval-matrix-panel";
import { EscalationRulesPanel } from "./escalation-rules-panel";
import { NotificationTemplatesPanel } from "./notification-templates-panel";

type WorkflowDetailDrawerProps = {
  workflow: WorkflowDefinition | null;
  onClose: () => void;
};

export function WorkflowDetailDrawer({ workflow, onClose }: WorkflowDetailDrawerProps) {
  if (!workflow) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close workflow detail"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative h-full w-full max-w-6xl overflow-y-auto bg-slate-50 p-6 shadow-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Workflow Detail</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{workflow.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {workflow.description ?? "No description."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Code</p>
              <p className="mt-1 font-semibold text-slate-950">{workflow.code ?? "-"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Module</p>
              <p className="mt-1 font-semibold text-slate-950">{workflow.module ?? "-"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Version</p>
              <p className="mt-1 font-semibold text-slate-950">v{workflow.version ?? 1}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowStatusTone(
                  workflow.status,
                )}`}
              >
                {workflow.status ?? (workflow.is_active ? "active" : "inactive")}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatWorkflowDate(workflow.created_at)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Updated</p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatWorkflowDate(workflow.updated_at)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Metadata</p>
            <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-white p-4 text-xs text-slate-700">
              {JSON.stringify(workflow.metadata_json ?? {}, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-6">
          <ApprovalMatrixPanel workflowId={workflow.id} />
        </div>

        <div className="mt-6">
          <EscalationRulesPanel workflowId={workflow.id} />
        </div>

        <div className="mt-6">
          <NotificationTemplatesPanel workflowId={workflow.id} />
        </div>
      </aside>
    </div>
  );
}


