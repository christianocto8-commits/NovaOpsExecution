"use client";

import { useCallback } from "react";

import { useAction } from "./use-action";

type UseStatusActionOptions<TId extends string | number, TStatus extends string> = {
  entityName: string;
  onStatusChange: (id: TId, status: TStatus) => Promise<void> | void;
  getSuccessMessage?: (status: TStatus) => string;
  errorMessage?: string;
};

export function useStatusAction<TId extends string | number, TStatus extends string>({
  entityName,
  onStatusChange,
  getSuccessMessage,
  errorMessage,
}: UseStatusActionOptions<TId, TStatus>) {
  const action = useAction<{ id: TId; status: TStatus }, void>({
    action: ({ id, status }) => onStatusChange(id, status),
    successMessage: (_, input) =>
      getSuccessMessage?.(input.status) ?? `${entityName} status updated successfully.`,
    errorMessage: (error) =>
      error instanceof Error
        ? error.message
        : (errorMessage ?? `Failed to update ${entityName.toLowerCase()} status.`),
  });

  const updateStatus = useCallback(
    async (id: TId, status: TStatus) => {
      await action.execute({ id, status });
      return true;
    },
    [action]
  );

  return {
    updateStatus,
    ...action,
  };
}
