"use client";

import { useCallback, useState } from "react";

import { useToast } from "@/shared/toast";

type ActionStatus = "idle" | "running" | "success" | "error";

type UseActionOptions<TInput, TResult> = {
  action: (input: TInput) => Promise<TResult> | TResult;
  successMessage?: string | ((result: TResult, input: TInput) => string);
  errorMessage?: string | ((error: unknown, input: TInput) => string);
  onSuccess?: (result: TResult, input: TInput) => Promise<void> | void;
  onError?: (error: unknown, input: TInput) => Promise<void> | void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
};

export function useAction<TInput = void, TResult = void>({
  action,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  showSuccessToast = true,
  showErrorToast = true,
}: UseActionOptions<TInput, TResult>) {
  const toast = useToast();
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [error, setError] = useState<unknown>(null);

  const execute = useCallback(
    async (input: TInput) => {
      setStatus("running");
      setError(null);

      try {
        const result = await action(input);

        setStatus("success");

        if (showSuccessToast && successMessage) {
          toast.success(
            typeof successMessage === "function"
              ? successMessage(result, input)
              : successMessage
          );
        }

        await onSuccess?.(result, input);

        return result;
      } catch (nextError) {
        setStatus("error");
        setError(nextError);

        const message =
          typeof errorMessage === "function"
            ? errorMessage(nextError, input)
            : errorMessage ??
              (nextError instanceof Error ? nextError.message : "Action failed.");

        if (showErrorToast) {
          toast.error(message);
        }

        await onError?.(nextError, input);

        throw nextError;
      }
    },
    [
      action,
      errorMessage,
      onError,
      onSuccess,
      showErrorToast,
      showSuccessToast,
      successMessage,
      toast,
    ]
  );

  return {
    execute,
    status,
    error,
    isIdle: status === "idle",
    isRunning: status === "running",
    isSuccess: status === "success",
    isError: status === "error",
  };
}
