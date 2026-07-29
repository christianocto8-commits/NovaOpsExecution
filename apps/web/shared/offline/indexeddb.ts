/**
 * Fase 2: Advanced Offline-First Background Sync Engine
 * IndexedDB persistent queue for offline form submissions.
 *
 * Stores pending form/checklist submissions locally when crew is offline,
 * then auto-syncs when connection is restored via Service Worker Background Sync.
 */

const DB_NAME = "novaops-offline-db";
const DB_VERSION = 1;
const STORE_QUEUE = "sync-queue";
const STORE_DRAFTS = "offline-drafts";

export type OfflineQueueEntry = {
  id: string; // unique entry ID (uuid)
  type: "form_submission" | "task_execution" | "evidence_upload";
  url: string; // API endpoint to POST to
  method: "POST" | "PUT" | "PATCH";
  payload: Record<string, unknown>;
  headers: Record<string, string>;
  createdAt: string; // ISO timestamp
  retryCount: number;
  lastError?: string;
};

export type OfflineDraft = {
  id: string;
  formId: string;
  taskId?: string;
  outletId?: string;
  data: Record<string, unknown>;
  savedAt: string;
};

// ─── Open IndexedDB ──────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Sync queue store
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
        queueStore.createIndex("createdAt", "createdAt");
        queueStore.createIndex("type", "type");
      }

      // Offline drafts store
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        const draftStore = db.createObjectStore(STORE_DRAFTS, { keyPath: "id" });
        draftStore.createIndex("formId", "formId");
        draftStore.createIndex("savedAt", "savedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Queue Operations ─────────────────────────────────────────────────────────

/** Add a new entry to the offline sync queue */
export async function enqueueOfflineRequest(
  entry: Omit<OfflineQueueEntry, "retryCount">
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).put({ ...entry, retryCount: 0 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending entries in the sync queue */
export async function getOfflineQueue(): Promise<OfflineQueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const request = tx.objectStore(STORE_QUEUE).getAll();
    request.onsuccess = () => resolve(request.result as OfflineQueueEntry[]);
    request.onerror = () => reject(request.error);
  });
}

/** Remove a successfully synced entry from queue */
export async function removeOfflineQueueEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Increment retry count and record last error on a failed entry */
export async function markOfflineQueueEntryFailed(
  id: string,
  error: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_QUEUE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as OfflineQueueEntry;
      if (entry) {
        store.put({ ...entry, retryCount: entry.retryCount + 1, lastError: error });
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Clear entire queue (e.g. on logout) */
export async function clearOfflineQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Draft Operations ─────────────────────────────────────────────────────────

/** Save a form draft locally while crew is filling in offline */
export async function saveOfflineDraft(draft: OfflineDraft): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, "readwrite");
    tx.objectStore(STORE_DRAFTS).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all saved offline drafts */
export async function getOfflineDrafts(): Promise<OfflineDraft[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, "readonly");
    const request = tx.objectStore(STORE_DRAFTS).getAll();
    request.onsuccess = () => resolve(request.result as OfflineDraft[]);
    request.onerror = () => reject(request.error);
  });
}

/** Get a specific draft by ID */
export async function getOfflineDraftById(id: string): Promise<OfflineDraft | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, "readonly");
    const request = tx.objectStore(STORE_DRAFTS).get(id);
    request.onsuccess = () => resolve((request.result as OfflineDraft) ?? null);
    request.onerror = () => reject(request.error);
  });
}

/** Delete a draft after successful submission */
export async function removeOfflineDraft(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, "readwrite");
    tx.objectStore(STORE_DRAFTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Count how many items are in the queue (for UI badge) */
export async function getOfflineQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const request = tx.objectStore(STORE_QUEUE).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
