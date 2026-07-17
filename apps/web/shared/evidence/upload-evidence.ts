import { buildApiUrl } from "@/lib/api-url";
import { storeOfflineEvidence } from "@/lib/offline/offline-evidence";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

export type EvidenceUploadResponse = {
  url: string;
  file_name: string;
  uploaded_at: string;
};

function isOfflineContext() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export async function uploadEvidenceFile(file: File) {
  if (isOfflineContext()) {
    const record = await storeOfflineEvidence(file);

    return {
      url: record.url,
      file_name: record.fileName,
      uploaded_at: record.createdAt,
    };
  }

  const formData = new FormData();
  const token = getToken();

  formData.append("file", file);

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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const record = await storeOfflineEvidence(file);

      return {
        url: record.url,
        file_name: record.fileName,
        uploaded_at: record.createdAt,
      };
    }

    throw error;
  }
}
