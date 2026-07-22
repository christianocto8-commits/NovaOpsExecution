let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
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
