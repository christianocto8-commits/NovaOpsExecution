import {
  getComplianceReports,
  getOutletReports,
  getReportSummary,
} from "@/features/reports/reports-api";

export type ReportKpi = {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
};

export type ComplianceCard = {
  id: string;
  title: string;
  score: number;
  status: "excellent" | "warning" | "critical";
};

export type AnalyticsRow = {
  id: string;
  outlet: string;
  region: string;
  complianceScore: number;
  completedTasks: number;
  overdueTasks: number;
  auditIssues: number;
  lastUpdated: string;
};

export type ReportsResponse = {
  kpis: ReportKpi[];
  compliance: ComplianceCard[];
  analytics: AnalyticsRow[];
};

function toTrend(value: number): ReportKpi["trend"] {
  if (value >= 85) return "up";
  if (value >= 70) return "neutral";
  return "down";
}

function toComplianceStatus(score: number): ComplianceCard["status"] {
  if (score >= 90) return "excellent";
  if (score >= 75) return "warning";
  return "critical";
}

export async function getReports(): Promise<ReportsResponse> {
  const [summary, outlets, compliance] = await Promise.all([
    getReportSummary(),
    getOutletReports(),
    getComplianceReports(),
  ]);

  const kpis: ReportKpi[] = [
    {
      id: "completion-rate",
      label: "Completion Rate",
      value: `${summary.completion_rate}%`,
      change: `${summary.open_tasks} open tasks`,
      trend: toTrend(summary.completion_rate),
    },
    {
      id: "overdue-tasks",
      label: "Overdue Tasks",
      value: String(summary.overdue_tasks),
      change: `${summary.compliance_rate}% compliance`,
      trend: summary.overdue_tasks > 3 ? "down" : "up",
    },
    {
      id: "audit-score",
      label: "Audit Score",
      value: `${summary.audit_score}%`,
      change: "Live backend reports",
      trend: toTrend(summary.audit_score),
    },
  ];

  const complianceCards: ComplianceCard[] = compliance.map((item, index) => ({
    id: `compliance-${index}`,
    title: item.category,
    score: item.score,
    status: toComplianceStatus(item.score),
  }));

  const analytics: AnalyticsRow[] = outlets.map((outlet) => ({
    id: String(outlet.outlet_id),
    outlet: outlet.outlet_name,
    region: "All Regions",
    complianceScore: outlet.compliance_rate,
    completedTasks: outlet.completion_rate,
    overdueTasks: outlet.overdue_tasks,
    auditIssues: Math.max(0, 100 - outlet.audit_score),
    lastUpdated: "Live",
  }));

  return {
    kpis,
    compliance: complianceCards,
    analytics,
  };
}
