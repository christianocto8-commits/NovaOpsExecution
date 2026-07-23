"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getOfflineEvidenceBlobUrl,
  isOfflineEvidenceUrl,
} from "@/lib/offline/offline-evidence";

import { resolveEvidenceDisplayUrl } from "../submission-evidence";

export function useEvidenceDisplayUrl(url: string) {
  const resolvedUrl = useMemo(() => resolveEvidenceDisplayUrl(url), [url]);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!resolvedUrl || !isOfflineEvidenceUrl(resolvedUrl)) {
      setOfflineBlobUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void getOfflineEvidenceBlobUrl(resolvedUrl).then((blobUrl) => {
      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }

      objectUrl = blobUrl;
      setOfflineBlobUrl(blobUrl);
    });

    return () => {
      cancelled = true;
      setOfflineBlobUrl(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedUrl]);

  return useMemo(() => {
    if (!resolvedUrl) return "";
    if (!isOfflineEvidenceUrl(resolvedUrl)) return resolvedUrl;
    return offlineBlobUrl ?? "";
  }, [resolvedUrl, offlineBlobUrl]);
}
