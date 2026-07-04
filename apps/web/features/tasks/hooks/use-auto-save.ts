"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { autoSaveDraft } from "../services/autosave";
import { AutoSavePayload, DraftSaveState } from "../types/autosave";

type UseAutoSaveOptions = {
  delay?: number;
  enabled?: boolean;
  getPayload: () => AutoSavePayload | null;
};

export function useAutoSave({
  delay = 1500,
  enabled = true,
  getPayload,
}: UseAutoSaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const [saveState, setSaveState] = useState<DraftSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveNow = useCallback(async () => {
    if (!enabled) return;

    const payload = getPayload();
    if (!payload) return;

    try {
      setSaveState("saving");

      await autoSaveDraft(payload);

      if (!mountedRef.current) return;

      setLastSavedAt(new Date());
      setSaveState("saved");
    } catch {
      if (!mountedRef.current) return;
      setSaveState("error");
    }
  }, [enabled, getPayload]);

  const markDirty = useCallback(() => {
    if (!enabled) return;

    setSaveState("dirty");
    clearTimer();

    timerRef.current = setTimeout(() => {
      void saveNow();
    }, delay);
  }, [clearTimer, delay, enabled, saveNow]);

  const forceSave = useCallback(async () => {
    clearTimer();
    await saveNow();
  }, [clearTimer, saveNow]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return {
    saveState,
    lastSavedAt,
    markDirty,
    forceSave,
  };
}
