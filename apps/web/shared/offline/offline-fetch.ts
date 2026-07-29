/**
 * Fase 2: Offline Submit Wrapper
 * Drop-in replacement for fetch() that automatically queues requests
 * to IndexedDB when the device is offline, then retries when online.
 *
 * Usage:
 *   import { offlineAwareFetch } from "@/shared/offline/offline-fetch";
 *
 *   await offlineAwareFetch("/api/v1/forms/submit", {
 *     method: "POST",
 *     body: JSON.stringify(formData),
 *     headers: { Authorization: `Bearer ${token}` },
 *   });
 */

import { v4 as uuidv4 } from "uuid";

import { enqueueOfflineRequest } from "./indexeddb";
import { registerBackgroundSync } from "./sync-manager";

export type OfflineFetchOptions = RequestInit & {
  /** Override default behavior: force queue even when online */
  forceQueue?: boolean;
  /** Type tag for the entry (shown in sync status) */
  queueType?: "form_submission" | "task_execution" | "evidence_upload";
};

/**
 * An offline-aware fetch wrapper.
 * - If ONLINE: behaves exactly like fetch().
 * - If OFFLINE: queues the request in IndexedDB and registers a Background Sync.
 * Returns a synthetic 202 response when queued offline.
 */
export async function offlineAwareFetch(
  url: string,
  options: OfflineFetchOptions = {}
): Promise<Response> {
  const { forceQueue = false, queueType = "form_submission", ...fetchOptions } = options;

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (!isOffline && !forceQueue) {
    // Online: normal fetch
    return fetch(url, fetchOptions);
  }

  // Offline: queue to IndexedDB
  const headers: Record<string, string> = {};
  if (fetchOptions.headers) {
    const h = new Headers(fetchOptions.headers);
    h.forEach((value, key) => {
      headers[key] = value;
    });
  }

  let payload: Record<string, unknown> = {};
  if (fetchOptions.body) {
    try {
      payload = JSON.parse(fetchOptions.body as string);
    } catch {
      payload = { _raw: fetchOptions.body };
    }
  }

  const entry = {
    id: uuidv4(),
    type: queueType,
    url: url.startsWith("http") ? url : `${window.location.origin}${url}`,
    method: (fetchOptions.method ?? "POST") as "POST" | "PUT" | "PATCH",
    payload,
    headers,
    createdAt: new Date().toISOString(),
    lastError: undefined,
  };

  await enqueueOfflineRequest(entry);
  await registerBackgroundSync();

  console.info(`[NovaOps Offline] Request queued (offline): ${entry.id}`);

  // Return a synthetic queued response
  return new Response(
    JSON.stringify({
      status: "queued_offline",
      message: "Submission disimpan secara offline dan akan dikirim saat terhubung kembali.",
      queue_id: entry.id,
    }),
    {
      status: 202,
      headers: { "Content-Type": "application/json", "X-Offline-Queue-Id": entry.id },
    }
  );
}
