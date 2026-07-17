import { OFFLINE_STORES, withStore, getAllFromStore } from "@/lib/offline/db";
import type {
  CachedFormTemplateRecord,
  CachedTasksRecord,
  EvidenceBlobRecord,
  LocalDraft,
  QueuedMutation,
} from "@/lib/offline/types";
import type { FormTemplate } from "@/features/forms/types";
import type { Task } from "@/features/tasks/types";

const TASKS_CACHE_KEY = "all";

export async function cacheTasks(tasks: Task[]) {
  const record: CachedTasksRecord = {
    id: TASKS_CACHE_KEY,
    tasks,
    cachedAt: new Date().toISOString(),
  };

  await withStore(OFFLINE_STORES.TASKS_CACHE, "readwrite", (store) => store.put(record));
}

export async function getCachedTasks(): Promise<Task[]> {
  const record = await withStore<CachedTasksRecord | undefined>(
    OFFLINE_STORES.TASKS_CACHE,
    "readonly",
    (store) => store.get(TASKS_CACHE_KEY)
  );

  return record?.tasks ?? [];
}

export async function updateCachedTask(taskId: string, updater: (task: Task) => Task) {
  const tasks = await getCachedTasks();
  const nextTasks = tasks.map((task) => (task.id === taskId ? updater(task) : task));

  if (!tasks.some((task) => task.id === taskId)) {
    return;
  }

  await cacheTasks(nextTasks);
}

export async function cacheFormTemplates(templates: FormTemplate[]) {
  await Promise.all(
    templates.map((template) => {
      const record: CachedFormTemplateRecord = {
        id: template.id,
        template,
        cachedAt: new Date().toISOString(),
      };

      return withStore(OFFLINE_STORES.FORM_TEMPLATES, "readwrite", (store) => store.put(record));
    })
  );
}

export async function getCachedFormTemplates(): Promise<FormTemplate[]> {
  const records = await getAllFromStore<CachedFormTemplateRecord>(OFFLINE_STORES.FORM_TEMPLATES);
  return records.map((record) => record.template);
}

export async function getCachedFormTemplate(templateId: string): Promise<FormTemplate | null> {
  const record = await withStore<CachedFormTemplateRecord | undefined>(
    OFFLINE_STORES.FORM_TEMPLATES,
    "readonly",
    (store) => store.get(templateId)
  );

  return record?.template ?? null;
}

export async function saveLocalDraft(draft: LocalDraft) {
  await withStore(OFFLINE_STORES.LOCAL_DRAFTS, "readwrite", (store) => store.put(draft));
}

export async function getLocalDraft(taskId: string): Promise<LocalDraft | null> {
  const draft = await withStore<LocalDraft | undefined>(OFFLINE_STORES.LOCAL_DRAFTS, "readonly", (store) =>
    store.get(taskId)
  );

  return draft ?? null;
}

export async function getAllLocalDrafts(): Promise<LocalDraft[]> {
  return getAllFromStore<LocalDraft>(OFFLINE_STORES.LOCAL_DRAFTS);
}

export async function deleteLocalDraft(taskId: string) {
  await withStore(OFFLINE_STORES.LOCAL_DRAFTS, "readwrite", (store) => store.delete(taskId));
}

export async function saveEvidenceBlob(record: EvidenceBlobRecord) {
  await withStore(OFFLINE_STORES.EVIDENCE_BLOBS, "readwrite", (store) => store.put(record));
}

export async function getEvidenceBlob(id: string): Promise<EvidenceBlobRecord | null> {
  const record = await withStore<EvidenceBlobRecord | undefined>(
    OFFLINE_STORES.EVIDENCE_BLOBS,
    "readonly",
    (store) => store.get(id)
  );

  return record ?? null;
}

export async function deleteEvidenceBlob(id: string) {
  await withStore(OFFLINE_STORES.EVIDENCE_BLOBS, "readwrite", (store) => store.delete(id));
}

export async function enqueueMutation(mutation: QueuedMutation) {
  await withStore(OFFLINE_STORES.MUTATION_QUEUE, "readwrite", (store) => store.put(mutation));
}

export async function updateMutation(mutation: QueuedMutation) {
  await withStore(OFFLINE_STORES.MUTATION_QUEUE, "readwrite", (store) => store.put(mutation));
}

export async function deleteMutation(mutationId: string) {
  await withStore(OFFLINE_STORES.MUTATION_QUEUE, "readwrite", (store) => store.delete(mutationId));
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const mutations = await getAllFromStore<QueuedMutation>(OFFLINE_STORES.MUTATION_QUEUE);

  return mutations
    .filter((mutation) => mutation.status === "pending" || mutation.status === "failed")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function getPendingMutationCount(): Promise<number> {
  const mutations = await getPendingMutations();
  return mutations.length;
}
