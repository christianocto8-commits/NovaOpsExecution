"use client";

import { useContext } from "react";

import { WorkflowBuilderContext } from "@/features/workflow-builder/context/workflow-builder-provider";

export function useWorkflowBuilder() {
  const context = useContext(WorkflowBuilderContext);

  if (!context) {
    throw new Error(
      "useWorkflowBuilder must be used inside WorkflowBuilderProvider"
    );
  }

  return context;
}
