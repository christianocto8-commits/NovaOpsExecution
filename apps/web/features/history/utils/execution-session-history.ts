import type { Task, TaskExecution, TaskExecutionForm } from "@/features/tasks/types";
import type { ExecutionSessionResponse } from "@/services/execution-session.service";
import type { HistoryDetailSelection } from "@/features/history/components/history-detail-drawer";
import { buildTaskEvidenceFromText } from "@/shared/evidence/submission-evidence";

function parseExecutionSession(session: ExecutionSessionResponse): TaskExecution | null {
  const payload = session.answers_json;

  if (!payload || typeof payload !== "object") return null;

  const operator = payload.operator as Record<string, unknown> | undefined;
  const responses = payload.responses as Record<string, unknown> | undefined;
  const submittedAt =
    typeof payload.submittedAt === "string"
      ? payload.submittedAt
      : session.submitted_at ?? new Date().toISOString();
  const evidenceText = typeof payload.evidence === "string" ? payload.evidence : "";

  return {
    operatorName: typeof operator?.name === "string" ? operator.name : "",
    operatorPosition:
      typeof operator?.position === "string"
        ? (operator.position as TaskExecutionForm["operatorPosition"])
        : "Crew",
    note: typeof payload.note === "string" ? payload.note : "",
    evidence: buildTaskEvidenceFromText(evidenceText, submittedAt),
    formResponses: Object.fromEntries(
      Object.entries(responses ?? {}).map(([key, value]) => [
        key,
        typeof value === "string" ? value : value == null ? "" : String(value),
      ])
    ),
    completedAt: submittedAt,
  };
}

export function getCompletedSessionsByTaskId(sessions: ExecutionSessionResponse[]) {
  const map = new Map<string, ExecutionSessionResponse>();

  sessions.forEach((session) => {
    if (session.status !== "completed" || session.task_id == null) return;

    const taskId = String(session.task_id);
    const current = map.get(taskId);

    if (!current || session.id > current.id) {
      map.set(taskId, session);
    }
  });

  return map;
}

export function enrichTasksWithCompletedSessions(
  tasks: Task[],
  sessions: ExecutionSessionResponse[]
) {
  const completedByTaskId = getCompletedSessionsByTaskId(sessions);

  return tasks.map((task) => {
    const session = completedByTaskId.get(task.id);
    if (!session) return task;

    const parsedExecution = parseExecutionSession(session);
    if (!parsedExecution) return task;

    return {
      ...task,
      execution: {
        ...(task.execution ?? parsedExecution),
        ...parsedExecution,
        reviewStatus: task.execution?.reviewStatus,
      },
    };
  });
}

export function resolveTaskSubmissionSelection(
  task: Task,
  sessionsByTaskId: Map<string, ExecutionSessionResponse>
): HistoryDetailSelection {
  const session = sessionsByTaskId.get(task.id);

  if (session) {
    return {
      kind: "session",
      session,
      taskTitle: task.title,
    };
  }

  return { kind: "task", task };
}

export function taskIdsWithCompletedSessions(sessions: ExecutionSessionResponse[]) {
  return new Set(getCompletedSessionsByTaskId(sessions).keys());
}
