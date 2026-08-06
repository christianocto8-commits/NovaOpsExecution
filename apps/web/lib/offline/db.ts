const DB_NAME = "novaops-offline";
const DB_VERSION = 1;

export const OFFLINE_STORES = {
  TASKS_CACHE: "tasks_cache",
  FORM_TEMPLATES: "form_templates",
  LOCAL_DRAFTS: "local_drafts",
  EVIDENCE_BLOBS: "evidence_blobs",
  EVIDENCE_URLS: "evidence_urls",
  MUTATION_QUEUE: "mutation_queue",
} as const;

type OfflineStoreName = (typeof OFFLINE_STORES)[keyof typeof OFFLINE_STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB tidak tersedia."));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(OFFLINE_STORES.TASKS_CACHE)) {
          db.createObjectStore(OFFLINE_STORES.TASKS_CACHE, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.FORM_TEMPLATES)) {
          db.createObjectStore(OFFLINE_STORES.FORM_TEMPLATES, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.LOCAL_DRAFTS)) {
          db.createObjectStore(OFFLINE_STORES.LOCAL_DRAFTS, { keyPath: "taskId" });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.EVIDENCE_BLOBS)) {
          db.createObjectStore(OFFLINE_STORES.EVIDENCE_BLOBS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.EVIDENCE_URLS)) {
          db.createObjectStore(OFFLINE_STORES.EVIDENCE_URLS, { keyPath: "id" });
        }

        if (!db.objectStoreNames.contains(OFFLINE_STORES.MUTATION_QUEUE)) {
          const queueStore = db.createObjectStore(OFFLINE_STORES.MUTATION_QUEUE, { keyPath: "id" });
          queueStore.createIndex("status", "status", { unique: false });
          queueStore.createIndex("createdAt", "createdAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Gagal membuka IndexedDB."));
    });
  }

  return dbPromise;
}

export async function withStore<T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    Promise.resolve(callback(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error ?? new Error("Operasi IndexedDB gagal."));
          return;
        }

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error ?? new Error("Transaksi IndexedDB gagal."));
      })
      .catch(reject);
  });
}

export async function getAllFromStore<T>(storeName: OfflineStoreName): Promise<T[]> {
  return withStore(storeName, "readonly", (store) => store.getAll());
}
