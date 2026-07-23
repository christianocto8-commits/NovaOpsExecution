"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { EvidenceReviewHub } from "@/features/evidence/components/evidence-review-hub";
import { enrichTasksWithCompletedSessions } from "@/features/history/utils/execution-session-history";
import { queryKeys } from "@/lib/query/keys";
import { getExecutionSessions } from "@/services/execution-session.service";
import { taskService } from "@/services/task.service";
import { useLanguage } from "@/shared/i18n";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

export default function EvidencePage() {
  const { t } = useLanguage();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  const tasksQuery = useQuery({
    queryKey: queryKeys.sop.tasks(),
    queryFn: taskService.listAll,
    retry: false,
  });

  const executionSessionsQuery = useQuery({
    queryKey: queryKeys.history.executionSessions(),
    queryFn: () => getExecutionSessions({ status: "completed" }),
    retry: false,
  });

  const tasks = useMemo(() => {
    const baseTasks = tasksQuery.data ?? [];
    const sessions = executionSessionsQuery.data ?? [];
    return enrichTasksWithCompletedSessions(baseTasks, sessions);
  }, [tasksQuery.data, executionSessionsQuery.data]);

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("evidence.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("evidence.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("evidence.subtitle")}</p>
      </div>

      {tasksQuery.isError || executionSessionsQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {tasksQuery.error instanceof Error
            ? tasksQuery.error.message
            : executionSessionsQuery.error instanceof Error
              ? executionSessionsQuery.error.message
              : t("evidence.loadError")}
        </div>
      ) : null}

      <EvidenceReviewHub
        tasks={tasks}
        workspace={workspace}
        title={t("evidence.hubTitle")}
        description={t("evidence.hubDescription")}
      />
    </main>
  );
}
