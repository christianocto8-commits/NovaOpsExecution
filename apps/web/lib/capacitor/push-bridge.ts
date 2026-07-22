/**
 * Native push bridge — FCM/APNs via Capacitor Push Notifications.
 * Requires google-services.json (Android) and APNs cert (iOS) for production.
 */

import { api } from "@/services/api";

const NATIVE_PUSH_TOKEN_KEY = "novaops_native_push_token";

export function getStoredNativePushToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NATIVE_PUSH_TOKEN_KEY);
}

export async function syncNativePushTokenToServer(platform: "android" | "ios" = "android") {
  const token = getStoredNativePushToken();
  if (!token || typeof window === "undefined") return false;

  const authToken = localStorage.getItem("novaops_token");
  if (!authToken) return false;

  try {
    await api("/api/v1/notifications/push/register-device", {
      method: "POST",
      body: JSON.stringify({ token, platform }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function registerNativePushIfAvailable() {
  if (typeof window === "undefined") return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return false;

    const { PushNotifications } = await import("@capacitor/push-notifications");
    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";

    await PushNotifications.addListener("registration", (event) => {
      if (event.value) {
        localStorage.setItem(NATIVE_PUSH_TOKEN_KEY, event.value);
        void syncNativePushTokenToServer(platform);
      }
    });

    await PushNotifications.addListener("registrationError", () => {
      localStorage.removeItem(NATIVE_PUSH_TOKEN_KEY);
    });

    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const title = notification.title ?? "NovaOps";
        const body = notification.body ?? "";
        new Notification(title, { body });
      }
    });

    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") return false;

    await PushNotifications.register();

    const existingToken = getStoredNativePushToken();
    if (existingToken) {
      await syncNativePushTokenToServer(platform);
    }

    return true;
  } catch {
    return false;
  }
}
