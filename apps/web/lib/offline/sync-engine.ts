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
import {
  formSubmissionService,
  type FormSubmissionCreatePayload,
} from "@/services/form-submission.service";
import { taskService } from "@/services/task.service";
import type { EvidenceUploadResponse } from "@/shared/evidence/upload-evidence";

export type SyncQueueResult = {
  processed: number;
  failed: number;
  errors: string[];
};

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

  return uploaded.url;
}

function collectOfflineEvidenceIds(value: unknown, ids = new Set<string>()) {
  if (typeof value === "string") {
    if (isOfflineEvidenceUrl(value)) {
      ids.add(getOfflineEvidenceId(value));
      return ids;
    }

    try {
      collectOfflineEvidenceIds(JSON.parse(value), ids);
    } catch {
      // Plain text answer, not a serialized evidence value.
    }

    return ids;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectOfflineEvidenceIds(item, ids));
    return ids;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => collectOfflineEvidenceIds(nestedValue, ids));
  }

  return ids;
}

async function deleteResolvedOfflineEvidence(payload: unknown) {
  const ids = Array.from(collectOfflineEvidenceIds(payload));

  await Promise.all(ids.map((id) => deleteEvidenceBlob(id)));
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
    await deleteResolvedOfflineEvidence(payload);
    return;
  }

  await createExecutionSession(sessionPayload);
  await deleteResolvedOfflineEvidence(payload);
}

async function processExecutionSubmit(mutation: QueuedMutation) {
  const payload = mutation.payload;
  const answersJson = await resolveAnswersJson(
    (payload.answers_json as Record<string, unknown>) ?? {}
  );

  const existingSessionId =
    typeof payload.existingSessionId === "number" ? payload.existingSessionId : null;

  if (existingSessionId) {
    await deleteExecutionSession(existingSessionId);
  }

  await taskService.submitExecution(mutation.taskId, {
    form_template_id: (payload.form_template_id as number | null) ?? null,
    answers_json: answersJson,
    latitude: typeof payload.latitude === "number" ? payload.latitude : null,
    longitude: typeof payload.longitude === "number" ? payload.longitude : null,
    accuracy_m: typeof payload.accuracy_m === "number" ? payload.accuracy_m : null,
  });

  await deleteLocalDraft(mutation.taskId);
  await deleteResolvedOfflineEvidence(payload);
}

async function resolveFormSubmissionAnswers(answers: FormSubmissionCreatePayload["answers"]) {
  return Promise.all(
    answers.map(async (answer) => {
      const resolved: (typeof answers)[number] = { ...answer };

      if (typeof resolved.answer_text === "string" && isOfflineEvidenceUrl(resolved.answer_text)) {
        resolved.answer_text = await resolveOfflineEvidenceUrl(resolved.answer_text);
      }

      if (typeof resolved.evidence_url === "string" && isOfflineEvidenceUrl(resolved.evidence_url)) {
        resolved.evidence_url = await resolveOfflineEvidenceUrl(resolved.evidence_url);
      }

      if (resolved.answer_json) {
        resolved.answer_json = await replaceOfflineUrlsInValue(resolved.answer_json);
      }

      return resolved;
    })
  );
}

async function processFormSubmit(mutation: QueuedMutation) {
  const payload = mutation.payload;
  const rawAnswers = (payload.answers as FormSubmissionCreatePayload["answers"]) ?? [];
  const answers = await resolveFormSubmissionAnswers(rawAnswers);

  await formSubmissionService.create({
    form_template_id: Number(payload.form_template_id),
    outlet_id: Number(payload.outlet_id),
    status: "submitted",
    responsible_person_name:
      typeof payload.responsible_person_name === "string"
        ? payload.responsible_person_name
        : null,
    answers,
  });
  await deleteResolvedOfflineEvidence(payload);
}

async function processMutation(mutation: QueuedMutation) {
  const processingMutation: QueuedMutation = {
    ...mutation,
    status: "processing",
    error: undefined,
    lastAttemptAt: new Date().toISOString(),
  };

  await updateMutation(processingMutation);

  try {
    if (mutation.type === "EXECUTION_DRAFT") {
      await processExecutionDraft(mutation);
    } else if (mutation.type === "EXECUTION_SUBMIT") {
      await processExecutionSubmit(mutation);
    } else if (mutation.type === "FORM_SUBMIT") {
      await processFormSubmit(mutation);
    }

    await deleteMutation(mutation.id);
  } catch (error) {
    const failedMutation: QueuedMutation = {
      ...mutation,
      status: "failed",
      retryCount: (mutation.retryCount ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Sinkronisasi gagal.",
    };

    await updateMutation(failedMutation);
    throw error;
  }
}

export async function processMutationQueue(): Promise<SyncQueueResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { processed: 0, failed: 0, errors: [] };
  }

  const mutations = await getPendingMutations();
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const mutation of mutations) {
    try {
      await processMutation(mutation);
      processed += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error
          ? error.message
          : mutation.error ?? "Sinkronisasi gagal.";
      const label = mutation.label ? `${mutation.label}: ` : "";
      errors.push(`${label}${message}`);
    }
  }

  return { processed, failed, errors };
}
