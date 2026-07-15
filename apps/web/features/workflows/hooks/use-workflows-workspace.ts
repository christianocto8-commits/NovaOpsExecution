"use client";

import { useCallback, useMemo, useState } from "react";

import { useWorkflowMutations, useWorkflows } from "@/features/workflows/hooks";
import type {
  WorkflowDefinition,
  WorkflowDefinitionCreate,
  WorkflowDefinitionUpdate,
} from "@/features/workflows/types";
import { getWorkflowMetrics } from "@/features/workflows/utils";

export type WorkflowFormState = {
  name: string;
  code: string;
  module: string;
  description: string;
  status: string;
  metadataText: string;
};

export const emptyWorkflowForm: WorkflowFormState = {
  name: "",
  code: "",
  module: "operations",
  description: "",
  status: "draft",
  metadataText: "{}",
};

function workflowToForm(workflow: WorkflowDefinition): WorkflowFormState {
  return {
    name: workflow.name ?? "",
    code: workflow.code ?? "",
    module: workflow.module ?? "operations",
    description: workflow.description ?? "",
    status: workflow.status ?? (workflow.is_active ? "published" : "draft"),
    metadataText: JSON.stringify(workflow.metadata_json ?? {}, null, 2),
  };
}

function parseMetadata(metadataText: string): Record<string, unknown> {
  if (!metadataText.trim()) return {};
  return JSON.parse(metadataText) as Record<string, unknown>;
}

function buildCreatePayload(form: WorkflowFormState): WorkflowDefinitionCreate {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    module: form.module.trim() || "operations",
    metadata_json: parseMetadata(form.metadataText),
    steps: [
      {
        code: "initial_review",
        name: "Initial Review",
        step_type: "approval",
        position: 1,
        config_json: {},
      },
    ],
  };
}

function buildUpdatePayload(form: WorkflowFormState): WorkflowDefinitionUpdate {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    module: form.module.trim() || "operations",
    status: form.status.trim() || "draft",
    is_active: form.status.trim() === "published" || form.status.trim() === "active",
    metadata_json: parseMetadata(form.metadataText),
  };
}

export function useWorkflowsWorkspace() {
  const workflowsQuery = useWorkflows();
  const mutations = useWorkflowMutations();

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowDefinition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<WorkflowFormState>(emptyWorkflowForm);
  const [formError, setFormError] = useState("");

  const workflows = useMemo(() => workflowsQuery.data ?? [], [workflowsQuery.data]);

  const metrics = useMemo(() => getWorkflowMetrics(workflows), [workflows]);
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows],
  );
  const setSelectedWorkflow = useCallback((workflow: WorkflowDefinition | null) => {
    setSelectedWorkflowId(workflow?.id ?? null);
  }, []);

  const isSaving =
    mutations.createWorkflow.isPending ||
    mutations.updateWorkflow.isPending ||
    mutations.deleteWorkflow.isPending;


  function openCreateWorkflow() {
    setEditingWorkflow(null);
    setForm(emptyWorkflowForm);
    setFormError("");
    setIsFormOpen(true);
  }

  function openEditWorkflow(workflow: WorkflowDefinition) {
    setEditingWorkflow(workflow);
    setForm(workflowToForm(workflow));
    setFormError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingWorkflow(null);
    setFormError("");
  }

  async function saveWorkflow() {
    if (!form.name.trim()) {
      setFormError("Workflow name is required.");
      return;
    }

    if (!form.code.trim()) {
      setFormError("Workflow code is required.");
      return;
    }

    try {
      setFormError("");

      if (editingWorkflow) {
        await mutations.updateWorkflow.mutateAsync({
          workflowId: editingWorkflow.id,
          payload: buildUpdatePayload(form),
        });
      } else {
        await mutations.createWorkflow.mutateAsync(buildCreatePayload(form));
      }

      closeForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save workflow.");
    }
  }

  async function deleteWorkflow(workflow: WorkflowDefinition) {
    const confirmed = window.confirm(
      `Delete workflow "${workflow.name}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await mutations.deleteWorkflow.mutateAsync(workflow.id);

      if (selectedWorkflowId === workflow.id) {
        setSelectedWorkflowId(null);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Failed to delete workflow.");
    }
  }

  return {
    workflows,
    metrics,
    selectedWorkflow,
    setSelectedWorkflow,
    editingWorkflow,
    isFormOpen,
    form,
    setForm,
    formError,
    isSaving,
    isLoading: workflowsQuery.isLoading,
    isError: workflowsQuery.isError,
    error: workflowsQuery.error,
    refetch: workflowsQuery.refetch,
    openCreateWorkflow,
    openEditWorkflow,
    closeForm,
    saveWorkflow,
    deleteWorkflow,
  };
}



