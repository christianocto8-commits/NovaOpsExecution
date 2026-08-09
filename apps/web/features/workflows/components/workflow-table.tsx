import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";

import type { WorkflowDefinition } from "@/features/workflows/types";
import { formatWorkflowDate, getWorkflowStatusTone } from "@/features/workflows/utils";

type WorkflowTableProps = {
  workflows: WorkflowDefinition[];
  onSelectWorkflow: (workflow: WorkflowDefinition) => void;
  onEditWorkflow: (workflow: WorkflowDefinition) => void;
  onDeleteWorkflow: (workflow: WorkflowDefinition) => void;
  onExecuteWorkflow: (workflow: WorkflowDefinition) => void;
};

export function WorkflowTable({
  workflows,
  onSelectWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onExecuteWorkflow,
}: WorkflowTableProps) {
  const columns: EnterpriseColumn<WorkflowDefinition>[] = [
    {
      key: "name",
      header: "Workflow",
      render: (workflow) => (
        <div>
          <p className="font-semibold text-slate-950">{workflow.name}</p>
          <p className="text-xs text-slate-500">{workflow.code ?? workflow.id}</p>
        </div>
      ),
    },
    {
      key: "Module",
      header: "Module",
      render: (workflow) => workflow.module ?? "-",
    },
    {
      key: "version",
      header: "Version",
      render: (workflow) => `v${workflow.version ?? 1}`,
    },
    {
      key: "status",
      header: "Status",
      render: (workflow) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowStatusTone(
            workflow.status
          )}`}
        >
          {workflow.status ?? (workflow.is_active ? "active" : "inactive")}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (workflow) => formatWorkflowDate(workflow.created_at),
    },
    {
      key: "id",
      header: "Action",
      render: (workflow) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelectWorkflow(workflow);
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            View
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onExecuteWorkflow(workflow);
            }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
          >
            Execute
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEditWorkflow(workflow);
            }}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteWorkflow(workflow);
            }}
            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <EnterpriseDataTable
      title="Workflow Definitions"
      description="Backend-driven workflow definitions ready for approval matrix, escalation, notification, and execution testing."
      columns={columns}
      data={workflows}
      getRowId={(workflow) => workflow.id}
      onRowClick={onSelectWorkflow}
    />
  );
}
