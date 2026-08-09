"use client";

import { useEffect, useMemo, useState } from "react";

import { getOfflineEvidenceBlobUrl, isOfflineEvidenceUrl } from "@/lib/offline/offline-evidence";

import { resolveEvidenceDisplayUrl } from "../submission-evidence";

function getAuthHeaders(): HeadersInit | undefined {
  if (typeof window === "undefined") return undefined;

  const token = localStorage.getItem("novaops_token");
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function needsAuthenticatedFetch(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return (
      parsed.pathname.startsWith("/api/v1/evidence-uploads/") ||
      parsed.pathname.startsWith("/uploads/evidence/")
    );
  } catch {
    return false;
  }
}

export function useEvidenceDisplayUrl(url: string) {
  const resolvedUrl = useMemo(() => resolveEvidenceDisplayUrl(url), [url]);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (
      !resolvedUrl ||
      (!isOfflineEvidenceUrl(resolvedUrl) && !needsAuthenticatedFetch(resolvedUrl))
    ) {
      setBlobUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    async function resolveBlobUrl() {
      if (isOfflineEvidenceUrl(resolvedUrl)) {
        return getOfflineEvidenceBlobUrl(resolvedUrl);
      }

      const response = await fetch(resolvedUrl, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok) return null;

      return URL.createObjectURL(await response.blob());
    }

    void resolveBlobUrl().then((nextBlobUrl) => {
      if (cancelled) {
        if (nextBlobUrl) URL.revokeObjectURL(nextBlobUrl);
        return;
      }

      objectUrl = nextBlobUrl;
      setBlobUrl(nextBlobUrl);
    });

    return () => {
      cancelled = true;
      setBlobUrl(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedUrl]);

  return useMemo(() => {
    if (!resolvedUrl) return "";
    if (isOfflineEvidenceUrl(resolvedUrl) || needsAuthenticatedFetch(resolvedUrl))
      return blobUrl ?? "";
    return resolvedUrl;
  }, [resolvedUrl, blobUrl]);
}
