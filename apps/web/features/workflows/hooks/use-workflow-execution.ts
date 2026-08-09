"use client";

import { useState } from "react";

import { useWorkflowMutations } from "@/features/workflows/hooks";
import type { WorkflowDefinition } from "@/features/workflows/types";

export type WorkflowExecutionFormState = {
  module: string;
  entity_type: string;
  entity_id: string;
  contextText: string;
};

export const emptyWorkflowExecutionForm: WorkflowExecutionFormState = {
  module: "tasks",
  entity_type: "task",
  entity_id: "",
  contextText: "{}",
};

function parseContext(contextText: string): Record<string, unknown> {
  if (!contextText.trim()) return {};
  return JSON.parse(contextText) as Record<string, unknown>;
}

export function useWorkflowExecution() {
  const mutations = useWorkflowMutations();

  const [selectedWorkflowForExecution, setSelectedWorkflowForExecution] =
    useState<WorkflowDefinition | null>(null);
  const [form, setForm] = useState<WorkflowExecutionFormState>(emptyWorkflowExecutionForm);
  const [error, setError] = useState("");

  const isOpen = Boolean(selectedWorkflowForExecution);
  const isSaving = mutations.createInstance.isPending;

  function openExecution(workflow: WorkflowDefinition) {
    setSelectedWorkflowForExecution(workflow);
    setForm({
      module: workflow.module ?? "tasks",
      entity_type: "task",
      entity_id: `manual-${Date.now()}`,
      contextText: JSON.stringify(
        {
          source: "workflow_execution_dialog",
          workflow_code: workflow.code ?? null,
          workflow_name: workflow.name,
        },
        null,
        2
      ),
    });
    setError("");
  }

  function closeExecution() {
    if (isSaving) return;
    setSelectedWorkflowForExecution(null);
    setForm(emptyWorkflowExecutionForm);
    setError("");
  }

  async function createInstance() {
    if (!selectedWorkflowForExecution) return;

    if (!form.module.trim()) {
      setError("Module is required.");
      return;
    }

    if (!form.entity_type.trim()) {
      setError("Entity type is required.");
      return;
    }

    if (!form.entity_id.trim()) {
      setError("Entity ID is required.");
      return;
    }

    try {
      setError("");

      await mutations.createInstance.mutateAsync({
        workflow_id: selectedWorkflowForExecution.id,
        module: form.module.trim(),
        entity_type: form.entity_type.trim(),
        entity_id: form.entity_id.trim(),
        context_json: parseContext(form.contextText),
      });

      closeExecution();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create workflow instance."
      );
    }
  }

  return {
    selectedWorkflowForExecution,
    form,
    setForm,
    error,
    isOpen,
    isSaving,
    openExecution,
    closeExecution,
    createInstance,
  };
}
