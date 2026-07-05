"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { WorkflowItem } from "../types/workflow";

interface WorkflowContextValue {
  current?: WorkflowItem;
  setCurrent(item?: WorkflowItem): void;
  clearCurrent(): void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<WorkflowItem>();

  const value = useMemo<WorkflowContextValue>(
    () => ({
      current,
      setCurrent,
      clearCurrent: () => setCurrent(undefined),
    }),
    [current]
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflowContext() {
  const context = useContext(WorkflowContext);

  if (!context) {
    throw new Error("useWorkflowContext must be used inside WorkflowProvider");
  }

  return context;
}
