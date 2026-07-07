import { showToast } from "../store";
import { ToastOptions } from "../types";

export function useToast() {
  return {
    success(description: string, options?: Omit<ToastOptions, "description" | "variant">) {
      return showToast({ ...options, description, variant: "success" });
    },

    error(description: string, options?: Omit<ToastOptions, "description" | "variant">) {
      return showToast({ ...options, description, variant: "error" });
    },

    warning(description: string, options?: Omit<ToastOptions, "description" | "variant">) {
      return showToast({ ...options, description, variant: "warning" });
    },

    info(description: string, options?: Omit<ToastOptions, "description" | "variant">) {
      return showToast({ ...options, description, variant: "info" });
    },

    show(options: ToastOptions) {
      return showToast(options);
    },
  };
}
