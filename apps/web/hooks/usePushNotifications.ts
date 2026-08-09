"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getVapidPublicKey,
  isPushConfigured,
  isPushSupported,
  registerPushServiceWorker,
  subscriptionToPayload,
  urlBase64ToUint8Array,
} from "@/lib/push/push-utils";
import { pushNotificationService } from "@/services/push-notification.service";

const SUBSCRIBED_KEY = "novaops_push_subscribed";
const DISMISSED_KEY = "novaops_push_prompt_dismissed";

export type PushNotificationState = {
  isSupported: boolean;
  isConfigured: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  canPrompt: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTest: () => Promise<void>;
  dismissPrompt: () => void;
};

export function usePushNotifications(): PushNotificationState {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(true);

  const isSupported = isPushSupported();
  const isConfigured = isPushConfigured();

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
    setIsSubscribed(localStorage.getItem(SUBSCRIBED_KEY) === "true");
    setPromptDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, [isSupported]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setPromptDismissed(true);
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || !isConfigured) {
      setError("Push notification belum dikonfigurasi di server.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setError("Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.");
        return false;
      }

      const registration = await registerPushServiceWorker();
      await navigator.serviceWorker.ready;

      const publicKey = getVapidPublicKey();
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await pushNotificationService.subscribe(subscriptionToPayload(subscription));

      localStorage.setItem(SUBSCRIBED_KEY, "true");
      localStorage.removeItem(DISMISSED_KEY);
      setIsSubscribed(true);
      setPromptDismissed(true);
      return true;
    } catch (subscribeError) {
      const message =
        subscribeError instanceof Error
          ? subscribeError.message
          : "Gagal mengaktifkan push notification.";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = registration ? await registration.pushManager.getSubscription() : null;

      if (subscription) {
        await pushNotificationService.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }

      localStorage.removeItem(SUBSCRIBED_KEY);
      setIsSubscribed(false);
      return true;
    } catch (unsubscribeError) {
      const message =
        unsubscribeError instanceof Error
          ? unsubscribeError.message
          : "Gagal menonaktifkan push notification.";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const sendTest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await pushNotificationService.test();
    } catch (testError) {
      const message =
        testError instanceof Error ? testError.message : "Gagal mengirim notifikasi uji.";
      setError(message);
      throw testError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const canPrompt = useMemo(() => {
    return (
      isSupported && isConfigured && !promptDismissed && !isSubscribed && permission !== "denied"
    );
  }, [isConfigured, isSubscribed, isSupported, permission, promptDismissed]);

  return {
    isSupported,
    isConfigured,
    permission,
    isSubscribed,
    isLoading,
    error,
    canPrompt,
    subscribe,
    unsubscribe,
    sendTest,
    dismissPrompt,
  };
}
