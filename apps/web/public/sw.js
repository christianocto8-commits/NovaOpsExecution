// NovaOps Service Worker — v6 (Fase 2: Background Sync + Offline Queue)

const SHELL_CACHE = "novaops-shell-v7";
const STATIC_CACHE = "novaops-static-v7";
const SYNC_TAG = "novaops-background-sync";
const DB_NAME = "novaops-offline-db";
const STORE_QUEUE = "sync-queue";
const MAX_RETRY = 5;

const SHELL_ROUTES = [
  "/",
  "/login",
  "/offline.html",
  "/dashboard/operator",
  "/dashboard/tasks",
  "/dashboard/forms",
  "/dashboard/corrective-actions",
  "/dashboard/evidence",
  "/manifest.json",
  "/novaops-icon-192.png",
  "/novaops-icon-512.png",
  "/novaops-icon.svg",
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ROUTES).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          for (const route of ["/dashboard/operator", "/offline.html", "/login", "/"]) {
            const match = await caches.match(route);
            if (match) return match;
          }

          return Response.error();
        })
    );
    return;
  }

  if (["script", "style"].includes(request.destination)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (["image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (!response.ok) return response;
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  }
});

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processOfflineQueueFromSW());
  }
});

async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function processOfflineQueueFromSW() {
  let db;
  try {
    db = await openOfflineDB();
  } catch {
    return;
  }

  const queue = await new Promise((resolve) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });

  let synced = 0;
  let failed = 0;

  for (const entry of queue) {
    if (entry.retryCount >= MAX_RETRY) {
      failed++;
      continue;
    }

    try {
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: { "Content-Type": "application/json", ...entry.headers },
        body: JSON.stringify(entry.payload),
      });

      if (response.ok) {
        const tx = db.transaction(STORE_QUEUE, "readwrite");
        tx.objectStore(STORE_QUEUE).delete(entry.id);
        synced++;
      } else {
        const tx = db.transaction(STORE_QUEUE, "readwrite");
        tx.objectStore(STORE_QUEUE).put({
          ...entry,
          retryCount: entry.retryCount + 1,
          lastError: `HTTP ${response.status}`,
        });
        failed++;
      }
    } catch (err) {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      tx.objectStore(STORE_QUEUE).put({
        ...entry,
        retryCount: entry.retryCount + 1,
        lastError: String(err),
      });
      failed++;
    }
  }

  // Notify open tabs about sync result
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "OFFLINE_SYNC_COMPLETE", synced, failed });
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let payload = {
    title: "NovaOps",
    body: "Anda memiliki pembaruan task baru.",
    url: "/dashboard/tasks",
    data: {},
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/novaops-icon-192.png",
      badge: "/novaops-icon-192.png",
      tag: payload.data?.event_type ?? "novaops-task",
      data: { url: payload.url ?? "/dashboard/tasks", ...payload.data },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/dashboard/tasks";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (!client.url.startsWith(self.location.origin) || !("focus" in client)) continue;
        if ("navigate" in client) return client.navigate(absoluteUrl).then(() => client.focus());
        return client.focus().then(() => clients.openWindow(absoluteUrl));
      }
      if (clients.openWindow) return clients.openWindow(absoluteUrl);
      return undefined;
    })
  );
});
