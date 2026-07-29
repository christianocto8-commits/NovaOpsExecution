"use client";

import { useEffect, useState, useCallback } from "react";

import { getOfflineQueueCount, getOfflineDrafts, type OfflineDraft } from "./indexeddb";
import {
  isOnline,
  getConnectionQuality,
  processOfflineQueue,
  registerOnlineSyncListener,
} from "./sync-manager";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export type UseOfflineSyncReturn = {
  isOnline: boolean;
  connectionQuality: "online" | "offline" | "slow";
  pendingCount: number;
  drafts: OfflineDraft[];
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncedCount: number;
  failedCount: number;
  triggerSync: () => Promise<void>;
  refreshDrafts: () => Promise<void>;
};

/**
 * React hook for managing offline sync state.
 * Provides:
 * - Online/offline detection with connection quality
 * - Pending queue count for UI badge
 * - Manual sync trigger
 * - Draft list management
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const [online, setOnline] = useState<boolean>(true);
  const [connectionQuality, setConnectionQuality] = useState<"online" | "offline" | "slow">(
    "online"
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);

  const refreshPendingCount = useCallback(async () => {
    const count = await getOfflineQueueCount();
    setPendingCount(count);
  }, []);

  const refreshDrafts = useCallback(async () => {
    const allDrafts = await getOfflineDrafts();
    setDrafts(allDrafts);
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncStatus("syncing");

    try {
      const result = await processOfflineQueue();
      setSyncedCount(result.synced);
      setFailedCount(result.failed);
      setLastSyncedAt(new Date());
      setSyncStatus(result.failed > 0 ? "error" : "synced");
      await refreshPendingCount();
    } catch {
      setSyncStatus("error");
    }

    // Reset to idle after 4s
    setTimeout(() => setSyncStatus("idle"), 4000);
  }, [refreshPendingCount]);

  useEffect(() => {
    // Initialize state
    setOnline(isOnline());
    setConnectionQuality(getConnectionQuality());
    refreshPendingCount();
    refreshDrafts();

    // Register online event sync listener
    registerOnlineSyncListener(async (result) => {
      setSyncedCount(result.synced);
      setFailedCount(result.failed);
      setLastSyncedAt(new Date());
      setSyncStatus(result.failed > 0 ? "error" : "synced");
      await refreshPendingCount();
      setTimeout(() => setSyncStatus("idle"), 4000);
    });

    const handleOnline = () => {
      setOnline(true);
      setConnectionQuality(getConnectionQuality());
      refreshPendingCount();
    };

    const handleOffline = () => {
      setOnline(false);
      setConnectionQuality("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresh pending count every 30 seconds
    const interval = setInterval(refreshPendingCount, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, refreshDrafts]);

  return {
    isOnline: online,
    connectionQuality,
    pendingCount,
    drafts,
    syncStatus,
    lastSyncedAt,
    syncedCount,
    failedCount,
    triggerSync,
    refreshDrafts,
  };
}
