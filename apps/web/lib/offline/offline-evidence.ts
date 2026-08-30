import { saveEvidenceBlob, getEvidenceBlob } from "@/lib/offline/store";
import { createLocalId } from "@/lib/local-id";
import type { EvidenceBlobRecord } from "@/lib/offline/types";

export const OFFLINE_EVIDENCE_PREFIX = "offline://evidence/";

export function isOfflineEvidenceUrl(url: string) {
  return url.startsWith(OFFLINE_EVIDENCE_PREFIX);
}

export function getOfflineEvidenceId(url: string) {
  return url.slice(OFFLINE_EVIDENCE_PREFIX.length);
}

export function buildOfflineEvidenceUrl(id: string) {
  return `${OFFLINE_EVIDENCE_PREFIX}${id}`;
}

export async function storeOfflineEvidence(file: File): Promise<EvidenceBlobRecord> {
  const id = createLocalId();
  const record: EvidenceBlobRecord = {
    id,
    url: buildOfflineEvidenceUrl(id),
    blob: file,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    createdAt: new Date().toISOString(),
  };

  await saveEvidenceBlob(record);
  return record;
}

const blobUrlCache = new Map<string, string>();

export async function getOfflineEvidenceBlobUrl(url: string): Promise<string | null> {
  if (!isOfflineEvidenceUrl(url)) return null;

  const id = getOfflineEvidenceId(url);

  const cached = blobUrlCache.get(id);
  if (cached) return cached;

  const record = await getEvidenceBlob(id);
  if (!record) return null;

  const blobUrl = URL.createObjectURL(record.blob);
  blobUrlCache.set(id, blobUrl);
  return blobUrl;
}

export function revokeOfflineEvidenceBlobUrl(url: string) {
  if (!isOfflineEvidenceUrl(url)) return;
  const id = getOfflineEvidenceId(url);
  const cached = blobUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    blobUrlCache.delete(id);
  }
}
