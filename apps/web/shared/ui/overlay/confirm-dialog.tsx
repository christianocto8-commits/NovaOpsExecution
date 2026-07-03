"use client";

import { ReactNode } from "react";
import { Button } from "@/shared/ui/primitives";
import { Modal } from "./modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  tone?: "danger" | "default";
  isLoading?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  tone = "default",
  isLoading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isDanger = danger || tone === "danger";

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      size="sm"
      closeOnOutsideClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>

          <Button
            variant={isDanger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      }
    >
      {children ? (
        children
      ) : (
        <div className="text-sm leading-6 text-slate-500">
          This action may affect operational data. Please confirm before continuing.
        </div>
      )}
    </Modal>
  );
}
