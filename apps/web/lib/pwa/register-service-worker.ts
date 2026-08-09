let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (process.env.NODE_ENV === "development") {
    return Promise.all([
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        ),
      "caches" in window
        ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        : Promise.resolve([]),
    ]).then(() => null);
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
        return null;
      });
  }

  return registrationPromise;
}
