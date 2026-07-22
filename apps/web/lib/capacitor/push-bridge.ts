/**
 * Native push bridge — FCM/APNs via Capacitor Push Notifications.
 * Requires google-services.json (Android) and APNs cert (iOS) for production.
 */

export async function registerNativePushIfAvailable() {
  if (typeof window === "undefined") return false;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return false;

    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== "granted") return false;

    await PushNotifications.register();
    return true;
  } catch {
    return false;
  }
}
