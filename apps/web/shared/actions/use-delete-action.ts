"use client";

import { useCallback } from "react";

import { useConfirmation } from "@/shared/confirmation";

import { useAction } from "./use-action";

type UseDeleteActionOptions<TId extends string | number> = {
  entityName: string;
  actionName?: string;
  getEntityLabel?: (id: TId) => string | undefined;
  confirmationTitle?: string;
  confirmationDescription?: (label: string) => string;
  confirmText?: string;
  loadingText?: string;
  successMessage?: string;
  errorMessage?: string;
  onDelete: (id: TId) => Promise<void> | void;
  onAfterDelete?: (id: TId) => Promise<void> | void;
};

export function useDeleteAction<TId extends string | number>({
  entityName,
  actionName = "Delete",
  getEntityLabel,
  confirmationTitle,
  confirmationDescription,
  confirmText,
  loadingText,
  successMessage,
  errorMessage,
  onDelete,
  onAfterDelete,
}: UseDeleteActionOptions<TId>) {
  const confirm = useConfirmation();

  const action = useAction<TId, void>({
    action: onDelete,
    successMessage: successMessage ?? `${entityName} ${actionName.toLowerCase()}d successfully.`,
    errorMessage: (error) =>
      error instanceof Error
        ? error.message
        : (errorMessage ?? `Failed to ${actionName.toLowerCase()} ${entityName.toLowerCase()}.`),
    onSuccess: (_, id) => onAfterDelete?.(id),
  });

  const deleteItem = useCallback(
    async (id: TId) => {
      const label = getEntityLabel?.(id) ?? `this ${entityName.toLowerCase()}`;

      const confirmed = await confirm({
        title: confirmationTitle ?? `${actionName} ${entityName}`,
        description:
          confirmationDescription?.(label) ??
          `Are you sure you want to ${actionName.toLowerCase()} ${label}?\n\nThis action cannot be undone.`,
        variant: "danger",
        confirmText: confirmText ?? actionName,
        cancelText: "Cancel",
        loadingText: loadingText ?? `${actionName}ing...`,
      });

      if (!confirmed) return false;

      await action.execute(id);
      return true;
    },
    [
      action,
      actionName,
      confirm,
      confirmText,
      confirmationDescription,
      confirmationTitle,
      entityName,
      getEntityLabel,
      loadingText,
    ]
  );

  return {
    deleteItem,
    ...action,
  };
}
