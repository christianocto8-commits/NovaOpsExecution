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
import {
  getFailedMutations,
  getPendingMutationCount,
  getPendingSyncTaskIds,
} from "@/lib/offline/store";
import { processMutationQueue } from "@/lib/offline/sync-engine";
import { queryKeys } from "@/lib/query/keys";

type OfflineSyncContextValue = {
  isOnline: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  pendingTaskIds: Set<string>;
  isSyncing: boolean;
  lastSyncErrors: string[];
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

const EXECUTION_DRAFT_QUERY_KEY = ["execution-sessions", "drafts"] as const;

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncErrors, setLastSyncErrors] = useState<string[]>([]);
  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const [count, failed, taskIds] = await Promise.all([
        getPendingMutationCount(),
        getFailedMutations(),
        getPendingSyncTaskIds(),
      ]);

      setPendingSyncCount(count);
      setFailedSyncCount(failed.length);
      setPendingTaskIds(taskIds);
    } catch {
      setPendingSyncCount(0);
      setFailedSyncCount(0);
      setPendingTaskIds(new Set());
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const result = await processMutationQueue();
      setLastSyncErrors(result.errors);

      await refreshPendingCount();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sop.tasks() }),
        queryClient.invalidateQueries({ queryKey: EXECUTION_DRAFT_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["local-drafts"] }),
        queryClient.invalidateQueries({ queryKey: ["form-submissions"] }),
      ]);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, queryClient, refreshPendingCount]);

  useEffect(() => {
    let cancelled = false;

    refreshPendingCount().catch(() => {
      if (!cancelled) {
        setPendingSyncCount(0);
        setFailedSyncCount(0);
        setPendingTaskIds(new Set());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOnline) {
      void syncNow();
    }
  }, [isOnline, syncNow]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingSyncCount,
      failedSyncCount,
      pendingTaskIds,
      isSyncing,
      lastSyncErrors,
      syncNow,
      refreshPendingCount,
    }),
    [
      isOnline,
      pendingSyncCount,
      failedSyncCount,
      pendingTaskIds,
      isSyncing,
      lastSyncErrors,
      syncNow,
      refreshPendingCount,
    ]
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
