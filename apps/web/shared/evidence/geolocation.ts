export type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
};

export async function getCurrentPosition(
  timeoutMs = 8000,
  options?: { highAccuracy?: boolean }
): Promise<GeolocationResult | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

  const highAccuracy = options?.highAccuracy ?? false;

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timer);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
        });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: highAccuracy ? 15_000 : 120_000,
        timeout: timeoutMs,
      }
    );
  });
}
