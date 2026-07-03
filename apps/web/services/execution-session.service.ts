import { api } from "./api";

export type CreateExecutionSessionPayload = {
  runtime_template_id: number;
  status: string;
  answers_json: Record<string, unknown>;
  submitted_by?: number | null;
};

export function createExecutionSession(payload: CreateExecutionSessionPayload) {
  return api("/execution-sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}