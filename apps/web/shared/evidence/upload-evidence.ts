import { resolveApiUrl } from "@/lib/api-url";

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

  const response = await fetch(`${resolveApiUrl()}/api/v1/evidence-uploads`, {
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
}
