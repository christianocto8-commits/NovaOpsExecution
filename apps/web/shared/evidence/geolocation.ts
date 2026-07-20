export type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
};

export async function getCurrentPosition(timeoutMs = 8000): Promise<GeolocationResult | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return null;
  }

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
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: timeoutMs,
      }
    );
  });
}
