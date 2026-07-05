import { api } from "@/services/api";

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

const fallbackReports: ReportsResponse = {
  kpis: [
    { id: "1", label: "Compliance Score", value: "94%", change: "+4.2%", trend: "up" },
    { id: "2", label: "Completed Tasks", value: "1,284", change: "+12%", trend: "up" },
    { id: "3", label: "Overdue Tasks", value: "38", change: "-8%", trend: "down" },
    { id: "4", label: "Audit Issues", value: "12", change: "0%", trend: "neutral" },
  ],
  compliance: [
    { id: "1", title: "Operational Compliance", score: 96, status: "excellent" },
    { id: "2", title: "Cleanliness Standard", score: 91, status: "excellent" },
    { id: "3", title: "Inventory Control", score: 83, status: "warning" },
    { id: "4", title: "Safety Audit", score: 72, status: "critical" },
  ],
  analytics: [
    {
      id: "1",
      outlet: "KOV Montre",
      region: "Central",
      complianceScore: 96,
      completedTasks: 412,
      overdueTasks: 8,
      auditIssues: 2,
      lastUpdated: "Today",
    },
    {
      id: "2",
      outlet: "KOV Heritage",
      region: "Central",
      complianceScore: 91,
      completedTasks: 338,
      overdueTasks: 12,
      auditIssues: 4,
      lastUpdated: "Today",
    },
    {
      id: "3",
      outlet: "KOV Sultan Agung",
      region: "East",
      complianceScore: 88,
      completedTasks: 297,
      overdueTasks: 10,
      auditIssues: 3,
      lastUpdated: "Yesterday",
    },
    {
      id: "4",
      outlet: "KOV Sula",
      region: "West",
      complianceScore: 84,
      completedTasks: 237,
      overdueTasks: 8,
      auditIssues: 3,
      lastUpdated: "Yesterday",
    },
  ],
};

export async function getReports(): Promise<ReportsResponse> {
  try {
    return await api<ReportsResponse>("/reports");
  } catch {
    return fallbackReports;
  }
}
