"use client";

import { useCallback } from "react";

import { useAction } from "./use-action";

type UseSaveActionOptions<TInput> = {
  createLabel?: string;
  updateLabel?: string;
  getMode: () => "create" | "update";
  onSave: (input: TInput) => Promise<void> | void;
  onAfterSave?: (input: TInput) => Promise<void> | void;
  successCreateMessage?: string;
  successUpdateMessage?: string;
  errorMessage?: string;
};

export function useSaveAction<TInput>({
  createLabel = "Record",
  updateLabel = "Record",
  getMode,
  onSave,
  onAfterSave,
  successCreateMessage,
  successUpdateMessage,
  errorMessage,
}: UseSaveActionOptions<TInput>) {
  const action = useAction<TInput, void>({
    action: onSave,
    successMessage: (_, input) => {
      const mode = getMode();

      return mode === "create"
        ? (successCreateMessage ?? `${createLabel} created successfully.`)
        : (successUpdateMessage ?? `${updateLabel} updated successfully.`);
    },
    errorMessage: (error) =>
      error instanceof Error ? error.message : (errorMessage ?? "Failed to save record."),
    onSuccess: (_, input) => onAfterSave?.(input),
  });

  const save = useCallback(
    async (input: TInput) => {
      await action.execute(input);
      return true;
    },
    [action]
  );

  return {
    save,
    ...action,
  };
}
