"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import {
  useWorkflowExecution,
  useWorkflowInstances,
  useWorkflowsWorkspace,
} from "@/features/workflows/hooks";
import type { WorkflowInstance } from "@/features/workflows/types";
import { WorkflowDetailDrawer } from "./workflow-detail-drawer";
import { WorkflowExecutionDialog } from "./workflow-execution-dialog";
import { WorkflowFormDialog } from "./workflow-form-dialog";
import { WorkflowInstanceDrawer } from "./workflow-instance-drawer";
import { WorkflowInstanceTable } from "./workflow-instance-table";
import { WorkflowMetrics } from "./workflow-metrics";
import { WorkflowTable } from "./workflow-table";

export function WorkflowsWorkspace() {
  const workspace = useWorkflowsWorkspace();
  const execution = useWorkflowExecution();
  const instancesQuery = useWorkflowInstances();
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);

  async function createInstance() {
    await execution.createInstance();
    await instancesQuery.refetch();
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Workflow Engine</p>
          <h1 className="text-2xl font-semibold text-slate-950">Workflow Management</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Validate Sprint 09 backend workflows, approval matrix, escalation rules, notifications,
            and workflow execution before building the visual canvas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void workspace.refetch();
              void instancesQuery.refetch();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={workspace.openCreateWorkflow}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {workspace.isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-700">Workflow API error</p>
          <p className="mt-1 text-sm text-red-600">
            {workspace.error instanceof Error
              ? workspace.error.message
              : "Unable to load workflows."}
          </p>
        </div>
      ) : null}

      {instancesQuery.isError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-700">Workflow Instance API error</p>
          <p className="mt-1 text-sm text-red-600">
            {instancesQuery.error instanceof Error
              ? instancesQuery.error.message
              : "Unable to load workflow instances."}
          </p>
        </div>
      ) : null}

      <WorkflowMetrics
        total={workspace.metrics.total}
        active={workspace.metrics.active}
        draft={workspace.metrics.draft}
        inactive={workspace.metrics.inactive}
      />

      {workspace.isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading workflow definitions...
        </div>
      ) : (
        <WorkflowTable
          workflows={workspace.workflows}
          onSelectWorkflow={workspace.setSelectedWorkflow}
          onEditWorkflow={workspace.openEditWorkflow}
          onDeleteWorkflow={workspace.deleteWorkflow}
          onExecuteWorkflow={execution.openExecution}
        />
      )}

      {instancesQuery.isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading workflow instances...
        </div>
      ) : (
        <WorkflowInstanceTable
          instances={instancesQuery.data ?? []}
          workflows={workspace.workflows}
          onSelectInstance={setSelectedInstance}
        />
      )}

      <WorkflowFormDialog
        open={workspace.isFormOpen}
        mode={workspace.editingWorkflow ? "edit" : "create"}
        form={workspace.form}
        error={workspace.formError}
        saving={workspace.isSaving}
        onChange={workspace.setForm}
        onClose={workspace.closeForm}
        onSave={() => void workspace.saveWorkflow()}
      />

      <WorkflowExecutionDialog
        open={execution.isOpen}
        workflow={execution.selectedWorkflowForExecution}
        form={execution.form}
        error={execution.error}
        saving={execution.isSaving}
        onChange={execution.setForm}
        onClose={execution.closeExecution}
        onCreate={() => void createInstance()}
      />

      <WorkflowDetailDrawer
        workflow={workspace.selectedWorkflow}
        onClose={() => workspace.setSelectedWorkflow(null)}
      />

      <WorkflowInstanceDrawer
        instance={selectedInstance}
        workflows={workspace.workflows}
        onClose={() => setSelectedInstance(null)}
      />
    </main>
  );
}
