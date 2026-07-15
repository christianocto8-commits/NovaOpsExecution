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

export async function getReports(): Promise<ReportsResponse> {
  return {
    kpis: [],
    compliance: [],
    analytics: [],
  };
}
