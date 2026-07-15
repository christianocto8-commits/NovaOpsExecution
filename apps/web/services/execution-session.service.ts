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