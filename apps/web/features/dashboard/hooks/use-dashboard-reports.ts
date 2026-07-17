"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getComplianceReports,
  getOutletReports,
  getReportSummary,
  getReportTrends,
} from "@/features/reports/reports-api";
import { queryKeys } from "@/lib/query/keys";

export function useDashboardReports() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.reports.summary(),
    queryFn: getReportSummary,
    retry: false,
  });

  const trendsQuery = useQuery({
    queryKey: queryKeys.reports.trends(),
    queryFn: getReportTrends,
    retry: false,
  });

  const outletsQuery = useQuery({
    queryKey: queryKeys.reports.outlets(),
    queryFn: getOutletReports,
    retry: false,
  });

  const complianceQuery = useQuery({
    queryKey: queryKeys.reports.compliance(),
    queryFn: getComplianceReports,
    retry: false,
  });

  return {
    summary: summaryQuery.data,
    trends: trendsQuery.data ?? [],
    outlets: outletsQuery.data ?? [],
    compliance: complianceQuery.data ?? [],
    isLoading:
      summaryQuery.isLoading ||
      trendsQuery.isLoading ||
      outletsQuery.isLoading ||
      complianceQuery.isLoading,
    isError:
      summaryQuery.isError ||
      trendsQuery.isError ||
      outletsQuery.isError ||
      complianceQuery.isError,
    error:
      summaryQuery.error ??
      trendsQuery.error ??
      outletsQuery.error ??
      complianceQuery.error,
  };
}
