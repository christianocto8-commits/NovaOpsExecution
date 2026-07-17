import { buildRequestUrl, getApiRequestCandidates } from "@/lib/api-url";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

export type EvidenceUploadResponse = {
  url: string;
  file_name: string;
  uploaded_at: string;
};

export async function uploadEvidenceFile(file: File) {
  const formData = new FormData();
  const token = getToken();

  formData.append("file", file);

  let lastError: unknown;

  for (const requestUrl of getApiRequestCandidates("/api/v1/evidence-uploads")) {
    try {
      const response = await fetch(requestUrl, {
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
      lastError = error;
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upload evidence gagal.");
}
