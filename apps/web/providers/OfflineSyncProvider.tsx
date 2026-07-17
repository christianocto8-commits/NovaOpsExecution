"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { getPendingMutationCount } from "@/lib/offline/store";
import { processMutationQueue } from "@/lib/offline/sync-engine";
import { queryKeys } from "@/lib/query/keys";

type OfflineSyncContextValue = {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

const EXECUTION_DRAFT_QUERY_KEY = ["execution-sessions", "drafts"] as const;

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingMutationCount();
      setPendingSyncCount(count);
    } catch {
      setPendingSyncCount(0);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      await processMutationQueue();
      await refreshPendingCount();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
        queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["local-drafts"] }),
      ]);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, queryClient, refreshPendingCount]);

  useEffect(() => {
    let cancelled = false;

    getPendingMutationCount()
      .then((count) => {
        if (!cancelled) {
          setPendingSyncCount(count);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingSyncCount(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      void syncNow();
    }
  }, [isOnline, syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingSyncCount,
      isSyncing,
      syncNow,
      refreshPendingCount,
    }),
    [isOnline, pendingSyncCount, isSyncing, syncNow, refreshPendingCount]
  );

  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);

  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }

  return context;
}
