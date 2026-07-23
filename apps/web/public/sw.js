const SHELL_CACHE = "novaops-shell-v2";
const STATIC_CACHE = "novaops-static-v2";

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

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ROUTES).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

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

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

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

          const fallbacks = ["/dashboard/operator", "/offline.html", "/login", "/"];
          for (const route of fallbacks) {
            const match = await caches.match(route);
            if (match) return match;
          }

          const offlinePage = await caches.match("/offline.html");
          if (offlinePage) return offlinePage;

          return Response.error();
        })
    );
    return;
  }

  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (!response.ok) return response;

          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

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

  const notificationOptions = {
    body: payload.body,
    icon: "/novaops-icon-192.png",
    badge: "/novaops-icon-192.png",
    tag: payload.data?.event_type ?? "novaops-task",
    data: {
      url: payload.url ?? "/dashboard/tasks",
      ...payload.data,
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/dashboard/tasks";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (!client.url.startsWith(self.location.origin) || !("focus" in client)) {
          continue;
        }

        if ("navigate" in client) {
          return client.navigate(absoluteUrl).then(() => client.focus());
        }

        return client.focus().then(() => clients.openWindow(absoluteUrl));
      }

      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }

      return undefined;
    }),
  );
});
