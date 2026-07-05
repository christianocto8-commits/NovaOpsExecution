"use client";

import { ReactNode } from "react";

import { WorkflowProvider } from "../providers/workflow-context";

export function EnterpriseWorkflowProvider({ children }: { children: ReactNode }) {
  return <WorkflowProvider>{children}</WorkflowProvider>;
}
