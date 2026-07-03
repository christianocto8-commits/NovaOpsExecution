"use client";

import { dashboardKpis, outletStatus, pendingApprovals, recentActivities } from "../data/dashboard-data";
import { StatCard, SectionCard, ActionCard } from "@/shared/ui/cards";
import { Badge, Button } from "@/shared/ui/primitives";
import { EmptyState } from "@/shared/ui/feedback";

export function ExecutiveDashboard() {
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
              Monitor compliance, task execution, evidence quality, and outlet readiness in one command center.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary">Export</Button>
            <Button>Create Task</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi) => (
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
          <div className="space-y-4">
            {outletStatus.map((outlet) => (
              <div
                key={outlet.name}
                className="flex items-center justify-between rounded-2xl border border-[#E7ECE9] bg-[#F7FAF8] p-4"
              >
                <div>
                  <div className="font-semibold text-[#1E1E1E]">{outlet.name}</div>
                  <div className="text-xs text-gray-500">Compliance {outlet.compliance}</div>
                </div>

                <Badge variant={outlet.status === "Review" ? "warning" : "success"}>
                  {outlet.status}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Actions" description="Common operation shortcuts.">
          <div className="space-y-4">
            <ActionCard title="Create Task" description="Assign new operational task." action={<Button size="sm">New Task</Button>} />
            <ActionCard title="Review Drafts" description="Continue Draft Center workflow." action={<Button size="sm" variant="secondary">Open</Button>} />
            <ActionCard title="Open Reports" description="Analyze operation performance." action={<Button size="sm" variant="outline">View</Button>} />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent Activity" description="Latest actions across outlets.">
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity} className="rounded-xl border border-[#E7ECE9] p-4 text-sm text-gray-700">
                {activity}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Pending Approvals"
          description="Items waiting for supervisor validation."
          actions={<Badge variant="warning">{pendingApprovals.length} Pending</Badge>}
        >
          <div className="space-y-3">
            {pendingApprovals.map((item) => (
              <div key={item.title} className="flex items-center justify-between rounded-xl border border-[#E7ECE9] p-4">
                <div>
                  <div className="text-sm font-semibold text-[#1E1E1E]">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.outlet}</div>
                </div>

                <Button size="sm" variant="outline">Review</Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Compliance Trend" description="Dummy chart placeholder for Sprint 05.5 API integration.">
        <EmptyState
          title="Chart Foundation Ready"
          description="Next sprint will connect this area to real operational analytics and backend reporting."
        />
      </SectionCard>
    </div>
  );
}