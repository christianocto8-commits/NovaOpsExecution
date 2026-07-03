"use client";

import { Button } from "@/shared/ui/primitives";
import { Modal } from "./modal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
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
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>

          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-gray-500">
        This action may affect operational data. Please confirm before continuing.
      </div>
    </Modal>
  );
}