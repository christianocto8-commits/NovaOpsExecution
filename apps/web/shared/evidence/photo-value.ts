export type PhotoFieldValue = {
  url: string;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
  captured_at?: number;
};

function coercePhoto(parsed: Partial<PhotoFieldValue> | unknown): PhotoFieldValue | null {
  if (typeof parsed !== "object" || parsed === null) return null;

  const candidate = parsed as Partial<PhotoFieldValue>;
  if (typeof candidate.url !== "string" || !candidate.url.trim()) return null;

  return {
    url: candidate.url.trim(),
    latitude: typeof candidate.latitude === "number" ? candidate.latitude : undefined,
    longitude: typeof candidate.longitude === "number" ? candidate.longitude : undefined,
    accuracy_m: typeof candidate.accuracy_m === "number" ? candidate.accuracy_m : undefined,
    captured_at: typeof candidate.captured_at === "number" ? candidate.captured_at : undefined,
  };
}

export function parsePhotoFieldValues(value: string): PhotoFieldValue[] {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => coercePhoto(item))
          .filter((item): item is PhotoFieldValue => item !== null);
      }
    } catch {
      return [];
    }
    return [];
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<PhotoFieldValue>;
      const photo = coercePhoto(parsed);
      return photo ? [photo] : [];
    } catch {
      return [];
    }
  }

  return [{ url: trimmed }];
}

export function parsePhotoFieldValue(value: string): PhotoFieldValue | null {
  return parsePhotoFieldValues(value)[0] ?? null;
}

export function serializePhotoFieldValues(values: PhotoFieldValue[]): string {
  const normalized = values.filter((item) => item && typeof item.url === "string" && item.url.trim());

  if (normalized.length === 0) return "";
  if (normalized.length === 1) return serializePhotoFieldValue(normalized[0]);

  return JSON.stringify(normalized);
}

export function serializePhotoFieldValue(value: PhotoFieldValue) {
  if (
    value.latitude == null &&
    value.longitude == null &&
    value.accuracy_m == null &&
    value.captured_at == null
  ) {
    return value.url;
  }

  return JSON.stringify(value);
}

export function getPhotoDisplayUrl(value: string) {
  return parsePhotoFieldValues(value)[0]?.url ?? value;
}