import type { ExecutionSessionResponse } from "@/services/execution-session.service";

export type ChecklistTrendPoint = {
  day: string;
  dateKey: string;
  score: number;
  passRate: number;
  submissions: number;
};

function parseChecklistScore(session: ExecutionSessionResponse) {
  const checklist = session.answers_json?._checklist;
  if (!checklist || typeof checklist !== "object") return null;

  const payload = checklist as Record<string, unknown>;
  const score = typeof payload.score === "number" ? payload.score : Number(payload.score ?? NaN);
  const status = payload.status;

  if (!Number.isFinite(score)) return null;

  return {
    score,
    passed: status === "pass",
  };
}

export function getChecklistTrend30Days(
  sessions: ExecutionSessionResponse[],
  passThreshold = 85
): ChecklistTrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completed = sessions.filter(
    (session) => session.status === "completed" && session.submitted_at
  );

  const points: ChecklistTrendPoint[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = date.toISOString().slice(0, 10);
    const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

    const daySessions = completed.filter(
      (session) => session.submitted_at?.slice(0, 10) === dateKey
    );

    const scores = daySessions
      .map(parseChecklistScore)
      .filter((row): row is NonNullable<typeof row> => row != null);

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, row) => sum + row.score, 0) / scores.length)
        : 0;

    const passRate =
      scores.length > 0
        ? Math.round(
            (scores.filter((row) => row.score >= passThreshold || row.passed).length /
              scores.length) *
              100
          )
        : 0;

    points.push({
      day,
      dateKey,
      score: averageScore,
      passRate,
      submissions: daySessions.length,
    });
  }

  return points;
}

export type OutletHeatmapItem = {
  outlet: string;
  score: number;
  submissions: number;
  tone: "strong" | "watch" | "risk" | "empty";
};

export function getOutletScoreHeatmap(
  sessions: ExecutionSessionResponse[],
  taskOutletById: Map<string, string>,
  passThreshold = 85
): OutletHeatmapItem[] {
  const outletScores = new Map<string, number[]>();

  sessions.forEach((session) => {
    if (session.status !== "completed" || session.task_id == null) return;

    const parsed = parseChecklistScore(session);
    if (!parsed) return;

    const outlet = taskOutletById.get(String(session.task_id)) ?? "Unknown Outlet";
    const current = outletScores.get(outlet) ?? [];
    current.push(parsed.score);
    outletScores.set(outlet, current);
  });

  return Array.from(outletScores.entries())
    .map(([outlet, scores]) => {
      const score = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
      let tone: OutletHeatmapItem["tone"] = "empty";

      if (scores.length === 0) tone = "empty";
      else if (score >= passThreshold) tone = "strong";
      else if (score >= passThreshold - 15) tone = "watch";
      else tone = "risk";

      return {
        outlet,
        score,
        submissions: scores.length,
        tone,
      };
    })
    .sort((first, second) => second.score - first.score);
}
