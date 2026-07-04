export type DraftSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutoSavePayload = {
  taskId: string;
  outletId?: string;
  formTemplateId?: string;
  values: Record<string, unknown>;
  progress?: number;
};
