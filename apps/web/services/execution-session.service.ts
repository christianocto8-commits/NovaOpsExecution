import { api } from "./api";

export type CreateExecutionSessionPayload = {
  runtime_template_id?: number | null;
  task_id?: number | null;
  form_template_id?: number | null;
  source_type?: string | null;
  status: string;
  answers_json: Record<string, unknown>;
  submitted_by?: number | null;
};

export type UpdateExecutionSessionPayload = Partial<CreateExecutionSessionPayload>;

export type ExecutionSessionResponse = {
  id: number;
  runtime_template_id: number | null;
  task_id: number | null;
  form_template_id: number | null;
  source_type: string | null;
  status: string;
  answers_json: Record<string, unknown>;
  submitted_by: number | null;
  submitted_at: string | null;
};

export function createExecutionSession(payload: CreateExecutionSessionPayload) {
  return api<ExecutionSessionResponse>("/api/v1/execution-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getExecutionSessions(params?: {
  taskId?: number;
  status?: string;
  sourceType?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.taskId !== undefined) {
    searchParams.set("task_id", String(params.taskId));
  }

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  if (params?.sourceType) {
    searchParams.set("source_type", params.sourceType);
  }

  const query = searchParams.toString();

  return api<ExecutionSessionResponse[]>(`/api/v1/execution-sessions${query ? `?${query}` : ""}`, {
    method: "GET",
  });
}

export function updateExecutionSession(sessionId: number, payload: UpdateExecutionSessionPayload) {
  return api<ExecutionSessionResponse>(`/api/v1/execution-sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteExecutionSession(sessionId: number) {
  return api<void>(`/api/v1/execution-sessions/${sessionId}`, {
    method: "DELETE",
  });
}
