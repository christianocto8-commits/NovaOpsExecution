import {
  createExecutionSession,
  getExecutionSessions,
  updateExecutionSession,
} from "@/services/execution-session.service";

import { AutoSavePayload } from "../types/autosave";

export async function autoSaveDraft(payload: AutoSavePayload) {
  const taskId = Number(payload.taskId);
  if (!Number.isFinite(taskId) || taskId <= 0) {
    throw new Error("Invalid task id for draft autosave");
  }

  const formTemplateId = payload.formTemplateId ? Number(payload.formTemplateId) : null;
  const answersJson = {
    responses: payload.values,
    progress: payload.progress ?? null,
  };

  const existing = await getExecutionSessions({
    taskId,
    status: "draft",
  });
  const current = existing[0];

  if (current) {
    return updateExecutionSession(current.id, {
      status: "draft",
      form_template_id: formTemplateId,
      answers_json: {
        ...(current.answers_json ?? {}),
        ...answersJson,
      },
      source_type: "task_execution",
    });
  }

  return createExecutionSession({
    task_id: taskId,
    form_template_id: formTemplateId,
    status: "draft",
    answers_json: answersJson,
    source_type: "task_execution",
  });
}
