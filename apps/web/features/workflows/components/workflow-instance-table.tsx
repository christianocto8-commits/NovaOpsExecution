import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";

import type { WorkflowDefinition, WorkflowInstance } from "@/features/workflows/types";
import { formatWorkflowDate } from "@/features/workflows/utils";

type WorkflowInstanceTableProps = {
  instances: WorkflowInstance[];
  workflows: WorkflowDefinition[];
  onSelectInstance: (instance: WorkflowInstance) => void;
};

function getWorkflowName(workflows: WorkflowDefinition[], workflowId: string) {
  return workflows.find((workflow) => workflow.id === workflowId)?.name ?? workflowId;
}

function getStatusTone(status?: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-rose-50 text-rose-700";
    case "returned":
      return "bg-amber-50 text-amber-700";
    case "cancelled":
      return "bg-slate-100 text-slate-500";
    case "pending_approval":
    case "submitted":
    case "open":
    case "in_review":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function WorkflowInstanceTable({
  instances,
  workflows,
  onSelectInstance,
}: WorkflowInstanceTableProps) {
  const columns: EnterpriseColumn<WorkflowInstance>[] = [
    {
      key: "entity_id",
      header: "Instance",
      render: (instance) => (
        <div>
          <p className="font-semibold text-slate-950">{instance.entity_id}</p>
          <p className="text-xs text-slate-500">
            {getWorkflowName(workflows, instance.workflow_id)}
          </p>
        </div>
      ),
    },
    {
      key: "module",
      header: "Module",
      render: (instance) => instance.module,
    },
    {
      key: "entity_type",
      header: "Entity Type",
      render: (instance) => instance.entity_type,
    },
    {
      key: "status",
      header: "Status",
      render: (instance) => (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
              instance.status,
            )}`}
          >
            {instance.status}
          </span>
          {instance.has_escalation ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              Escalated
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "current_step_id",
      header: "Current Step",
      render: (instance) => instance.current_step_id ?? "-",
    },
    {
      key: "created_at",
      header: "Created",
      render: (instance) => formatWorkflowDate(instance.created_at),
    },
    {
      key: "id",
      header: "Action",
      render: (instance) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelectInstance(instance);
          }}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <EnterpriseDataTable
      title="Workflow Instances"
      description="Workflow runs linked to NovaOps business entities."
      columns={columns}
      data={instances}
      getRowId={(instance) => instance.id}
      onRowClick={onSelectInstance}
    />
  );
}
