import { createLocalId } from "@/lib/local-id";
import { ConfirmationOptions, ConfirmationRequest } from "./types";

let currentRequest: ConfirmationRequest | null = null;
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeConfirmation(listener: () => void) {
  listeners = [...listeners, listener];

  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function getConfirmationSnapshot() {
  return currentRequest;
}

export function requestConfirmation(options: ConfirmationOptions) {
  return new Promise<boolean>((resolve) => {
    currentRequest = {
      id: createLocalId(),
      variant: "info",
      confirmText: "Confirm",
      cancelText: "Cancel",
      loadingText: "Processing...",
      ...options,
      resolve,
    };

    emit();
  });
}

export function resolveConfirmation(confirmed: boolean) {
  if (!currentRequest) return;

  currentRequest.resolve(confirmed);
  currentRequest = null;

  emit();
}
