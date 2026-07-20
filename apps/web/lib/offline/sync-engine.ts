import { buildApiUrl } from "@/lib/api-url";
import {
  deleteEvidenceBlob,
  deleteLocalDraft,
  deleteMutation,
  getPendingMutations,
  updateMutation,
} from "@/lib/offline/store";
import {
  getOfflineEvidenceId,
  isOfflineEvidenceUrl,
} from "@/lib/offline/offline-evidence";
import type { QueuedMutation } from "@/lib/offline/types";
import {
  createExecutionSession,
  deleteExecutionSession,
  getExecutionSessions,
  updateExecutionSession,
} from "@/services/execution-session.service";
import { taskService } from "@/services/task.service";
import type { EvidenceUploadResponse } from "@/shared/evidence/upload-evidence";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token");
}

async function uploadEvidenceBlob(blob: Blob, fileName: string): Promise<EvidenceUploadResponse> {
  const formData = new FormData();
  const token = getToken();
  const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });

  formData.append("file", file);

  const response = await fetch(buildApiUrl("/api/v1/evidence-uploads"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload evidence gagal saat sinkronisasi.");
  }

  return (await response.json()) as EvidenceUploadResponse;
}

async function resolveOfflineEvidenceUrl(offlineUrl: string): Promise<string> {
  const { getEvidenceBlob } = await import("@/lib/offline/store");
  const record = await getEvidenceBlob(getOfflineEvidenceId(offlineUrl));

  if (!record) {
    throw new Error("Bukti offline tidak ditemukan.");
  }

  const uploaded = await uploadEvidenceBlob(record.blob, record.fileName);
  await deleteEvidenceBlob(record.id);

  return uploaded.url;
}

async function replaceOfflineUrlsInValue(value: unknown): Promise<unknown> {
  if (typeof value === "string") {
    if (!isOfflineEvidenceUrl(value)) return value;
    return resolveOfflineEvidenceUrl(value);
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => replaceOfflineUrlsInValue(item)));
  }

  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value).map(async ([key, nestedValue]) => [key, await replaceOfflineUrlsInValue(nestedValue)])
    );

    return Object.fromEntries(entries);
  }

  return value;
}

async function resolveAnswersJson(answersJson: Record<string, unknown>) {
  return (await replaceOfflineUrlsInValue(answersJson)) as Record<string, unknown>;
}

async function findExistingDraftSessionId(taskId: string) {
  const sessions = await getExecutionSessions({ sourceType: "sop_task", taskId: Number(taskId) });
  const draftSessions = sessions.filter((session) => session.status === "draft");

  if (draftSessions.length === 0) return null;

  return draftSessions.reduce((latest, session) => (session.id > latest.id ? session : latest)).id;
}

async function processExecutionDraft(mutation: QueuedMutation) {
  const payload = mutation.payload;
  const answersJson = await resolveAnswersJson(
    (payload.answers_json as Record<string, unknown>) ?? {}
  );

  const sessionPayload = {
    task_id: Number(payload.task_id),
    form_template_id: (payload.form_template_id as number | null) ?? null,
    source_type: "sop_task",
    status: "draft",
    answers_json: answersJson,
    submitted_by: null,
  };

  const existingSessionId =
    typeof payload.existingSessionId === "number"
      ? payload.existingSessionId
      : await findExistingDraftSessionId(mutation.taskId);

  if (existingSessionId) {
    await updateExecutionSession(existingSessionId, sessionPayload);
    return;
  }

  await createExecutionSession(sessionPayload);
}

async function processExecutionSubmit(mutation: QueuedMutation) {
  const payload = mutation.payload;
  const answersJson = await resolveAnswersJson(
    (payload.answers_json as Record<string, unknown>) ?? {}
  );

  await taskService.submitExecution(mutation.taskId, {
    form_template_id: (payload.form_template_id as number | null) ?? null,
    answers_json: answersJson,
  });

  await deleteLocalDraft(mutation.taskId);
}

async function processMutation(mutation: QueuedMutation) {
  const processingMutation: QueuedMutation = {
    ...mutation,
    status: "processing",
    error: undefined,
  };

  await updateMutation(processingMutation);

  try {
    if (mutation.type === "EXECUTION_DRAFT") {
      await processExecutionDraft(mutation);
    } else if (mutation.type === "EXECUTION_SUBMIT") {
      await processExecutionSubmit(mutation);
    }

    await deleteMutation(mutation.id);
  } catch (error) {
    const failedMutation: QueuedMutation = {
      ...mutation,
      status: "failed",
      error: error instanceof Error ? error.message : "Sinkronisasi gagal.",
    };

    await updateMutation(failedMutation);
    throw error;
  }
}

export async function processMutationQueue() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const mutations = await getPendingMutations();
  let processed = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      await processMutation(mutation);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed, failed };
}
