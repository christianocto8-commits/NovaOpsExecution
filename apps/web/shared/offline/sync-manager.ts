/**
 * Fase 2: Background Sync Manager
 * Processes the offline queue and retries pending API submissions
 * when the device regains internet connection.
 */

import {
  getOfflineQueue,
  markOfflineQueueEntryFailed,
  removeOfflineQueueEntry,
  type OfflineQueueEntry,
} from "./indexeddb";

const MAX_RETRY = 5;
const SYNC_TAG = "novaops-background-sync";

// ─── Register Service Worker Background Sync ──────────────────────────────────

/**
 * Register a Background Sync tag so the Service Worker will
 * attempt to process the queue as soon as connection is available,
 * even if the browser tab is closed.
 */
export async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ("sync" in registration) {
      // @ts-expect-error – Background Sync API types
      await registration.sync.register(SYNC_TAG);
      console.info("[NovaOps Offline] Background sync registered:", SYNC_TAG);
    }
  } catch (err) {
    console.warn("[NovaOps Offline] Background sync registration failed:", err);
  }
}

// ─── Process Queue (called by SW or manually when online) ─────────────────────

/**
 * Process all pending entries in the offline queue.
 * Called by:
 *  1. Service Worker `sync` event handler (background)
 *  2. `online` event listener in the app (foreground fallback)
 */
export async function processOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const queue = await getOfflineQueue();

  if (queue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const entry of queue) {
    if (entry.retryCount >= MAX_RETRY) {
      console.warn(
        `[NovaOps Offline] Entry ${entry.id} exceeded max retries (${MAX_RETRY}), skipping.`
      );
      failed++;
      continue;
    }

    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: {
          "Content-Type": "application/json",
          ...entry.headers,
        },
        body: JSON.stringify(entry.payload),
      });

      if (response.ok) {
        await removeOfflineQueueEntry(entry.id);
        synced++;
        console.info(`[NovaOps Offline] Synced entry: ${entry.id} (${entry.type})`);
      } else {
        const errText = await response.text();
        await markOfflineQueueEntryFailed(entry.id, `HTTP ${response.status}: ${errText}`);
        failed++;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await markOfflineQueueEntryFailed(entry.id, errMsg);
      failed++;
      console.warn(`[NovaOps Offline] Failed to sync entry ${entry.id}:`, errMsg);
    }
  }

  return { synced, failed };
}

// ─── Online Event Listener (Foreground Fallback) ──────────────────────────────

let syncListenerRegistered = false;

/**
 * Listen for the browser `online` event and trigger queue processing.
 * This is the fallback for when Background Sync API is not available.
 * Call once during app initialization.
 */
export function registerOnlineSyncListener(
  onSyncComplete?: (result: { synced: number; failed: number }) => void
): void {
  if (syncListenerRegistered || typeof window === "undefined") return;

  syncListenerRegistered = true;

  window.addEventListener("online", async () => {
    console.info("[NovaOps Offline] Connection restored. Processing offline queue...");

    await registerBackgroundSync();
    const result = await processOfflineQueue();

    console.info(
      `[NovaOps Offline] Sync complete — synced: ${result.synced}, failed: ${result.failed}`
    );

    if (onSyncComplete) {
      onSyncComplete(result);
    }
  });

  // Also process immediately if currently online and queue has items
  if (navigator.onLine) {
    processOfflineQueue().then((result) => {
      if (result.synced > 0 && onSyncComplete) {
        onSyncComplete(result);
      }
    });
  }
}

// ─── Network Status Helpers ───────────────────────────────────────────────────

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function getConnectionQuality(): "online" | "offline" | "slow" {
  if (typeof navigator === "undefined") return "online";
  if (!navigator.onLine) return "offline";

  // @ts-expect-error – Network Information API (Chrome/Android)
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")) {
    return "slow";
  }

  return "online";
}
