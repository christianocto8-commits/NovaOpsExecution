import type { Task, TaskExecutionForm } from "@/features/tasks/types";

export type LocalDraft = {
  taskId: string;
  form: TaskExecutionForm;
  answersJson: Record<string, unknown>;
  updatedAt: string;
};

export type QueuedMutationType = "EXECUTION_DRAFT" | "EXECUTION_SUBMIT" | "FORM_SUBMIT";

export type QueuedMutation = {
  id: string;
  type: QueuedMutationType;
  taskId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: "pending" | "processing" | "failed" | "conflict";
  error?: string;
  retryCount?: number;
  lastAttemptAt?: string;
  label?: string;
  submissionKey?: string;
};

export type EvidenceBlobRecord = {
  id: string;
  url: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

export type CachedTasksRecord = {
  id: "all";
  tasks: Task[];
  cachedAt: string;
};

export type CachedFormTemplateRecord = {
  id: string;
  template: import("@/features/forms/types").FormTemplate;
  cachedAt: string;
};
