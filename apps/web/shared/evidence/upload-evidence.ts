import { buildApiUrl } from "@/lib/api-url";
import { storeOfflineEvidence } from "@/lib/offline/offline-evidence";
import type { GeolocationResult } from "./geolocation";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

export type EvidenceUploadResponse = {
  url: string;
  file_name: string;
  uploaded_at: string;
  latitude?: number | null;
  longitude?: number | null;
  accuracy_m?: number | null;
};

export type EvidenceUploadOptions = {
  geolocation?: GeolocationResult | null;
};

function isOfflineContext() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function isNetworkFailure(error: unknown) {
  return (
    error instanceof TypeError || (error instanceof DOMException && error.name === "NetworkError")
  );
}

async function storeEvidenceForOfflineSync(file: File, options: EvidenceUploadOptions) {
  const record = await storeOfflineEvidence(file);

  return {
    url: record.url,
    file_name: record.fileName,
    uploaded_at: record.createdAt,
    latitude: options.geolocation?.latitude ?? null,
    longitude: options.geolocation?.longitude ?? null,
    accuracy_m: options.geolocation?.accuracy_m ?? null,
  };
}

export async function uploadEvidenceFile(file: File, options: EvidenceUploadOptions = {}) {
  if (isOfflineContext()) {
    return storeEvidenceForOfflineSync(file, options);
  }

  const formData = new FormData();
  const token = getToken();

  formData.append("file", file);

  if (options.geolocation) {
    formData.append("latitude", String(options.geolocation.latitude));
    formData.append("longitude", String(options.geolocation.longitude));

    if (options.geolocation.accuracy_m != null) {
      formData.append("accuracy_m", String(options.geolocation.accuracy_m));
    }
  }

  try {
    const response = await fetch(buildApiUrl("/api/v1/evidence-uploads"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = "Upload evidence gagal.";

      try {
        const payload = (await response.json()) as { detail?: string };
        if (payload.detail) {
          errorMessage = payload.detail;
        }
      } catch {
        // Keep fallback message when response is not JSON.
      }

      throw new Error(errorMessage);
    }

    return (await response.json()) as EvidenceUploadResponse;
  } catch (error) {
    if (isOfflineContext() || isNetworkFailure(error)) {
      return storeEvidenceForOfflineSync(file, options);
    }

    throw error;
  }
}
