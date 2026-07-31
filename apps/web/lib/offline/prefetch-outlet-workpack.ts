import { formTemplateService } from "@/services/form-template.service";
import { hasBrowserSessionMarker } from "@/lib/auth/browser-session";
import { taskService } from "@/services/task.service";

export type OutletWorkpackPrefetchResult = {
  taskCount: number;
  templateCount: number;
  prefetchedTemplateIds: string[];
};

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("novaops_token") ?? (hasBrowserSessionMarker() ? "cookie" : null);
}

/**
 * Prefetch assigned tasks and form templates for offline day-pack use.
 * Safe to call repeatedly; underlying services update IndexedDB caches.
 */
export async function prefetchOutletWorkpack(): Promise<OutletWorkpackPrefetchResult> {
  if (!getAuthToken()) {
    return { taskCount: 0, templateCount: 0, prefetchedTemplateIds: [] };
  }

  const tasks = await taskService.listAll();
  const templates = await formTemplateService.list();

  const referencedTemplateIds = Array.from(
    new Set(
      tasks
        .map((task) => task.formTemplateId)
        .filter((templateId): templateId is string => Boolean(templateId))
    )
  );

  const cachedTemplateIds = new Set(templates.map((template) => template.id));
  const missingTemplateIds = referencedTemplateIds.filter(
    (templateId) => !cachedTemplateIds.has(templateId)
  );

  await Promise.all(
    missingTemplateIds.map((templateId) => formTemplateService.get(templateId).catch(() => null))
  );

  return {
    taskCount: tasks.length,
    templateCount: templates.length + missingTemplateIds.length,
    prefetchedTemplateIds: referencedTemplateIds,
  };
}
