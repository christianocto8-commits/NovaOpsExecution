"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  probeBackendConnectivity,
  subscribeCapacitorNetwork,
} from "@/lib/capacitor/network-bridge";

type OnlineStore = {
  browserOnline: boolean;
  backendReachable: boolean;
  capacitorOnline: boolean | null;
};

let store: OnlineStore = {
  browserOnline: true,
  backendReachable: true,
  capacitorOnline: null,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribeStore(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getOnlineSnapshot() {
  if (store.capacitorOnline === false) {
    return false;
  }

  if (!store.browserOnline) {
    return false;
  }

  return store.backendReachable;
}

function getServerSnapshot() {
  return true;
}

function setBrowserOnline(next: boolean) {
  if (store.browserOnline === next) return;
  store = { ...store, browserOnline: next };
  emitChange();
}

function setBackendReachable(next: boolean) {
  if (store.backendReachable === next) return;
  store = { ...store, backendReachable: next };
  emitChange();
}

function setCapacitorOnline(next: boolean) {
  if (store.capacitorOnline === next) return;
  store = { ...store, capacitorOnline: next };
  emitChange();
}

let probeInterval: number | null = null;

function startBrowserListeners() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  store = {
    browserOnline: navigator.onLine,
    backendReachable: true,
    capacitorOnline: null,
  };

  const onOnline = () => {
    setBrowserOnline(true);
    void probeBackendConnectivity().then(setBackendReachable);
  };
  const onOffline = () => setBrowserOnline(false);

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  probeInterval = window.setInterval(() => {
    if (!navigator.onLine) {
      setBackendReachable(false);
      return;
    }

    void probeBackendConnectivity().then(setBackendReachable);
  }, 30_000);

  void probeBackendConnectivity().then(setBackendReachable);

  const unsubscribeCapacitor = subscribeCapacitorNetwork(setCapacitorOnline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    unsubscribeCapacitor();
    if (probeInterval !== null) {
      window.clearInterval(probeInterval);
      probeInterval = null;
    }
  };
}

let browserCleanup: (() => void) | undefined;
let browserListenerCount = 0;

function ensureBrowserListeners() {
  browserListenerCount += 1;
  if (browserListenerCount === 1) {
    browserCleanup = startBrowserListeners();
  }

  return () => {
    browserListenerCount -= 1;
    if (browserListenerCount === 0) {
      browserCleanup?.();
      browserCleanup = undefined;
    }
  };
}

function subscribe(callback: () => void) {
  const cleanupBrowser = ensureBrowserListeners();
  const cleanupStore = subscribeStore(callback);

  return () => {
    cleanupStore();
    cleanupBrowser();
  };
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getOnlineSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isOnline) return;

    void probeBackendConnectivity().then(setBackendReachable);
  }, [isOnline]);

  return { isOnline };
}
