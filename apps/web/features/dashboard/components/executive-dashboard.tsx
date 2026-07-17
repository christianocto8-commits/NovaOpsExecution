"use client";

import Link from "next/link";

import { LineChartCard } from "@/shared/analytics/charts";
import { StatCard, SectionCard, ActionCard } from "@/shared/ui/cards";
import { Badge, Button } from "@/shared/ui/primitives";
import { EmptyState } from "@/shared/ui/feedback";

import { useDashboardReports } from "../hooks/use-dashboard-reports";

function formatTrend(value: number) {
  if (value >= 85) return `+${value}% healthy`;
  if (value >= 70) return `${value}% watch`;
  return `${value}% at risk`;
}

export function ExecutiveDashboard() {
  const { summary, trends, outlets, compliance, isLoading, isError, error } =
    useDashboardReports();

  const kpis = summary
    ? [
        {
          title: "Compliance",
          value: `${summary.compliance_rate}%`,
          description: "Approved vs completed tasks",
          trend: formatTrend(summary.compliance_rate),
        },
        {
          title: "Open Tasks",
          value: String(summary.open_tasks),
          description: "Tasks still in progress",
          trend: summary.open_tasks === 0 ? "All clear" : "Needs follow-up",
        },
        {
          title: "Overdue",
          value: String(summary.overdue_tasks),
          description: "Past due and incomplete",
          trend: summary.overdue_tasks === 0 ? "On track" : "Action required",
        },
        {
          title: "Completion",
          value: `${summary.completion_rate}%`,
          description: "Overall task completion rate",
          trend: formatTrend(summary.completion_rate),
        },
      ]
    : [];

  const trendChartData = trends.map((point) => ({
    day: point.date,
    completion: point.compliance,
    completed: point.completed,
    overdue: point.overdue,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#E7ECE9] bg-white p-8 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <Badge variant="primary">Executive Workspace</Badge>
            <h2 className="mt-4 text-3xl font-bold text-[#1E1E1E]">
              Today&apos;s Operation Summary
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Live compliance, task execution, and outlet readiness from the reports API.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/dashboard/reports">
              <Button variant="secondary">Reports</Button>
            </Link>
            <Link href="/dashboard/tasks">
              <Button>Create Task</Button>
            </Link>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Unable to load dashboard reports."}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <StatCard
                key={index}
                title="Loading..."
                value="—"
                description="Fetching live reports"
                trend="—"
              />
            ))
          : kpis.map((kpi) => (
              <StatCard
                key={kpi.title}
                title={kpi.title}
                value={kpi.value}
                description={kpi.description}
                trend={kpi.trend}
              />
            ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="Outlet Status"
          description="Live outlet readiness and compliance snapshot."
          className="xl:col-span-2"
          actions={<Badge variant="success">Live</Badge>}
        >
          {outlets.length === 0 ? (
            <EmptyState
              title="No outlet data yet"
              description="Outlet metrics appear after tasks are created and executed."
            />
          ) : (
            <div className="space-y-4">
              {outlets.map((outlet) => (
                <div
                  key={outlet.outlet_id}
                  className="flex items-center justify-between rounded-2xl border border-[#E7ECE9] bg-[#F7FAF8] p-4"
                >
                  <div>
                    <div className="font-semibold text-[#1E1E1E]">{outlet.outlet_name}</div>
                    <div className="text-xs text-gray-500">
                      Compliance {outlet.compliance_rate}% • {outlet.overdue_tasks} overdue
                    </div>
                  </div>

                  <Badge variant={outlet.overdue_tasks > 0 ? "warning" : "success"}>
                    {outlet.overdue_tasks > 0 ? "Review" : "Healthy"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Quick Actions" description="Common operation shortcuts.">
          <div className="space-y-4">
            <ActionCard
              title="Create Task"
              description="Assign new operational task."
              action={
                <Link href="/dashboard/tasks">
                  <Button size="sm">New Task</Button>
                </Link>
              }
            />
            <ActionCard
              title="Review Drafts"
              description="Continue Draft Center workflow."
              action={
                <Link href="/dashboard/drafts">
                  <Button size="sm" variant="secondary">
                    Open
                  </Button>
                </Link>
              }
            />
            <ActionCard
              title="Open Reports"
              description="Analyze operation performance."
              action={
                <Link href="/dashboard/reports">
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              }
            />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Compliance Categories" description="Operational health by category.">
          {compliance.length === 0 ? (
            <EmptyState
              title="No compliance categories"
              description="Compliance breakdown appears once tasks are recorded."
            />
          ) : (
            <div className="space-y-3">
              {compliance.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-xl border border-[#E7ECE9] p-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#1E1E1E]">{item.category}</div>
                    <div className="text-xs text-gray-500">Score {item.score}%</div>
                  </div>
                  <Badge variant={item.status === "healthy" ? "success" : "warning"}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Overdue Watch"
          description="Outlets with the highest overdue task count."
        >
          {outlets.filter((outlet) => outlet.overdue_tasks > 0).length === 0 ? (
            <EmptyState
              title="No overdue tasks"
              description="All outlets are currently on schedule."
            />
          ) : (
            <div className="space-y-3">
              {outlets
                .filter((outlet) => outlet.overdue_tasks > 0)
                .sort((a, b) => b.overdue_tasks - a.overdue_tasks)
                .slice(0, 5)
                .map((outlet) => (
                  <div
                    key={outlet.outlet_id}
                    className="rounded-xl border border-[#E7ECE9] p-4 text-sm text-gray-700"
                  >
                    <span className="font-semibold text-[#1E1E1E]">{outlet.outlet_name}</span>
                    {" — "}
                    {outlet.overdue_tasks} overdue task{outlet.overdue_tasks === 1 ? "" : "s"}
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      </div>

      <LineChartCard
        title="Compliance Trend"
        description="Seven-day task completion and compliance trend."
        data={trendChartData}
        xKey="day"
        series={[
          { dataKey: "completion", name: "Compliance %" },
          { dataKey: "completed", name: "Completed" },
        ]}
      />
    </div>
  );
}
