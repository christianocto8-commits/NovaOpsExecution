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
    icon: "/window.svg",
    badge: "/window.svg",
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
