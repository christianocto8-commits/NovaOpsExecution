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
import { hasBrowserSessionMarker } from "@/lib/auth/browser-session";
import { prefetchOutletWorkpack } from "@/lib/offline/prefetch-outlet-workpack";
import {
  getFailedMutations,
  getFailedSyncTaskIds,
  getPendingMutationCount,
  getPendingSyncTaskIds,
} from "@/lib/offline/store";
import { processMutationQueue } from "@/lib/offline/sync-engine";
import { queryKeys } from "@/lib/query/keys";

export type WorkpackStats = {
  taskCount: number;
  templateCount: number;
  lastPrefetchedAt: string | null;
};

type OfflineSyncContextValue = {
  isOnline: boolean;
  pendingSyncCount: number;
  failedSyncCount: number;
  pendingTaskIds: Set<string>;
  failedTaskIds: Set<string>;
  isSyncing: boolean;
  isPrefetching: boolean;
  workpackStats: WorkpackStats | null;
  lastSyncErrors: string[];
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  refreshWorkpack: () => Promise<void>;
};

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

const EXECUTION_DRAFT_QUERY_KEY = ["execution-sessions", "drafts"] as const;
const OFFLINE_QUEUE_CHANGE_EVENT = "novaops-offline-queue-change";

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isOnline } = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [failedTaskIds, setFailedTaskIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncErrors, setLastSyncErrors] = useState<string[]>([]);
  const [workpackStats, setWorkpackStats] = useState<WorkpackStats | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const isSyncingRef = useRef(false);
  const hasPrefetchedRef = useRef(false);

  const refreshWorkpack = useCallback(async () => {
    if (!isOnline || typeof window === "undefined") return;
    if (!localStorage.getItem("novaops_token") && !hasBrowserSessionMarker()) return;

    setIsPrefetching(true);

    try {
      const result = await prefetchOutletWorkpack();
      setWorkpackStats({
        taskCount: result.taskCount,
        templateCount: result.templateCount,
        lastPrefetchedAt: new Date().toISOString(),
      });
      hasPrefetchedRef.current = true;
    } catch {
      // Best-effort cache warm-up; ignore transient network errors.
    } finally {
      setIsPrefetching(false);
    }
  }, [isOnline]);

  const refreshPendingCount = useCallback(async () => {
    try {
      const [count, failed, taskIds, failedTaskIdSet] = await Promise.all([
        getPendingMutationCount(),
        getFailedMutations(),
        getPendingSyncTaskIds(),
        getFailedSyncTaskIds(),
      ]);

      setPendingSyncCount(count);
      setFailedSyncCount(failed.length);
      setPendingTaskIds(taskIds);
      setFailedTaskIds(failedTaskIdSet);
    } catch {
      setPendingSyncCount(0);
      setFailedSyncCount(0);
      setPendingTaskIds(new Set());
      setFailedTaskIds(new Set());
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
      await refreshWorkpack();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, refreshWorkpack, queryClient, refreshPendingCount]);

  useEffect(() => {
    if (!isOnline || hasPrefetchedRef.current) return;

    void refreshWorkpack();
  }, [isOnline, refreshWorkpack]);

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
    const handleQueueChange = () => {
      void refreshPendingCount();
    };

    window.addEventListener(OFFLINE_QUEUE_CHANGE_EVENT, handleQueueChange);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_CHANGE_EVENT, handleQueueChange);
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
      failedTaskIds,
      isSyncing,
      isPrefetching,
      workpackStats,
      lastSyncErrors,
      syncNow,
      refreshPendingCount,
      refreshWorkpack,
    }),
    [
      isOnline,
      pendingSyncCount,
      failedSyncCount,
      pendingTaskIds,
      failedTaskIds,
      isSyncing,
      isPrefetching,
      workpackStats,
      lastSyncErrors,
      syncNow,
      refreshPendingCount,
      refreshWorkpack,
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
