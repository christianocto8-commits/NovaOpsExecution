import { saveEvidenceBlob, getEvidenceBlob } from "@/lib/offline/store";
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
  const id = crypto.randomUUID();
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

export async function getOfflineEvidenceBlobUrl(url: string): Promise<string | null> {
  if (!isOfflineEvidenceUrl(url)) return null;

  const record = await getEvidenceBlob(getOfflineEvidenceId(url));
  if (!record) return null;

  return URL.createObjectURL(record.blob);
}
