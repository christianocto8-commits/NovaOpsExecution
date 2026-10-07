import { Suspense } from "react";

import { TasksWorkspace } from "@/features/tasks/components";
import { Skeleton, TaskSkeleton } from "@/shared/skeleton/skeleton";

function DashboardTasksPageContent() {
  return <TasksWorkspace />;
}

export default function DashboardTasksPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-9 w-48 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <TaskSkeleton />
          </div>
        </main>
      }
    >
      <DashboardTasksPageContent />
    </Suspense>
  );
}
