"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DISMISSED_KEY = "novaops_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export type PwaInstallState = {
  canPrompt: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isLoading: boolean;
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
};

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIos = isIosDevice();

  useEffect(() => {
    setPromptDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    setIsInstalled(isStandaloneDisplayMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setPromptDismissed(true);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    setIsLoading(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deferredPrompt]);

  const canPrompt = useMemo(() => {
    if (isInstalled || promptDismissed) return false;
    if (deferredPrompt) return true;
    return isIos;
  }, [deferredPrompt, isInstalled, isIos, promptDismissed]);

  return {
    canPrompt,
    isInstalled,
    isIos,
    isLoading,
    promptInstall,
    dismissPrompt,
  };
}
