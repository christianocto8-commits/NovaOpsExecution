export type PhotoFieldValue = {
  url: string;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
};

export function parsePhotoFieldValue(value: string): PhotoFieldValue | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<PhotoFieldValue>;
      if (typeof parsed.url === "string" && parsed.url.trim()) {
        return {
          url: parsed.url.trim(),
          latitude: typeof parsed.latitude === "number" ? parsed.latitude : undefined,
          longitude: typeof parsed.longitude === "number" ? parsed.longitude : undefined,
          accuracy_m: typeof parsed.accuracy_m === "number" ? parsed.accuracy_m : undefined,
        };
      }
    } catch {
      return null;
    }
  }

  return { url: trimmed };
}

export function serializePhotoFieldValue(value: PhotoFieldValue) {
  if (
    value.latitude == null &&
    value.longitude == null &&
    value.accuracy_m == null
  ) {
    return value.url;
  }

  return JSON.stringify(value);
}

export function getPhotoDisplayUrl(value: string) {
  return parsePhotoFieldValue(value)?.url ?? value;
}
