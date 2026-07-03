import { api } from "@/services/api";

export type ReportSummary = {
  completion_rate: number;
  open_tasks: number;
  overdue_tasks: number;
  compliance_rate: number;
  audit_score: number;
};

export type ReportTrendPoint = {
  date: string;
  completed: number;
  overdue: number;
  compliance: number;
};

export type OutletReport = {
  outlet_id: number;
  outlet_name: string;
  completion_rate: number;
  overdue_tasks: number;
  compliance_rate: number;
  audit_score: number;
};

export type ComplianceReport = {
  category: string;
  score: number;
  status: "excellent" | "good" | "warning" | "critical";
};

export async function getReportSummary() {
  return api<ReportSummary>("/reports/summary");
}

export async function getReportTrends() {
  return api<ReportTrendPoint[]>("/reports/trends");
}

export async function getOutletReports() {
  return api<OutletReport[]>("/reports/outlets");
}

export async function getComplianceReports() {
  return api<ComplianceReport[]>("/reports/compliance");
}