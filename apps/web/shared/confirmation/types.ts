export type ConfirmationVariant = "danger" | "warning" | "info" | "success";

export type ConfirmationOptions = {
  title: string;
  description?: string;
  variant?: ConfirmationVariant;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
};

export type ConfirmationRequest = ConfirmationOptions & {
  id: string;
  resolve: (confirmed: boolean) => void;
};
