type NetworkStatusListener = (connected: boolean) => void;

const capacitorListeners = new Set<NetworkStatusListener>();
let capacitorInitialized = false;

function notifyCapacitorListeners(connected: boolean) {
  capacitorListeners.forEach((listener) => listener(connected));
}

async function initCapacitorNetwork() {
  if (capacitorInitialized || typeof window === "undefined") {
    return;
  }

  capacitorInitialized = true;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    notifyCapacitorListeners(status.connected);

    await Network.addListener("networkStatusChange", (nextStatus) => {
      notifyCapacitorListeners(nextStatus.connected);
    });
  } catch {
    // Capacitor packages not installed — web fallback only.
  }
}

export function subscribeCapacitorNetwork(listener: NetworkStatusListener) {
  void initCapacitorNetwork();
  capacitorListeners.add(listener);

  return () => {
    capacitorListeners.delete(listener);
  };
}

export async function probeBackendConnectivity() {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4000);
    const response = await fetch("/api/v1/health", {
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
