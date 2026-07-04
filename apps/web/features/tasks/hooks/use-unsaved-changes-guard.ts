"use client";

import { useEffect } from "react";

type UseUnsavedChangesGuardOptions = {
  enabled: boolean;
  message?: string;
};

export function useUnsavedChangesGuard({
  enabled,
  message = "You have unsaved changes. Leave anyway?",
}: UseUnsavedChangesGuardOptions) {
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!enabled) return;

      event.preventDefault();
      event.returnValue = message;
      return message;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, message]);

  function confirmLeave() {
    if (!enabled) return true;

    return window.confirm(message);
  }

  return {
    confirmLeave,
  };
}
