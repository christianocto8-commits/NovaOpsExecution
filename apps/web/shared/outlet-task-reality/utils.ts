import { OUTLET_TASK_FORM_REPORTS } from "./data";
import { OutletTaskFormReport } from "./types";

export function getOutletTaskFormReports(
  reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS
) {
  return reports;
}

export function getOutletTaskFormSummary(
  reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS
) {
  const total = reports.length;
  const completed = reports.filter((report) =>
    ["Completed", "Submitted"].includes(report.status)
  ).length;
  const draft = reports.filter((report) => report.status === "Draft").length;
  const pending = reports.filter((report) => report.status === "Pending").length;
  const overdue = reports.filter((report) => report.status === "Overdue").length;

  const averageProgress =
    total > 0 ? Math.round(reports.reduce((sum, report) => sum + report.progress, 0) / total) : 0;

  const averageScore =
    total > 0 ? Math.round(reports.reduce((sum, report) => sum + report.score, 0) / total) : 0;

  return {
    total,
    completed,
    draft,
    pending,
    overdue,
    averageProgress,
    averageScore,
  };
}

export function getOutletTaskStatusDistribution(
  reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS
) {
  const summary = getOutletTaskFormSummary(reports);

  return [
    { name: "Completed/Submitted", value: summary.completed },
    { name: "Draft", value: summary.draft },
    { name: "Pending", value: summary.pending },
    { name: "Overdue", value: summary.overdue },
  ];
}

export function getOutletTaskPerformance(
  reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS
) {
  const outlets = Array.from(new Set(reports.map((report) => report.outlet)));

  return outlets.map((outlet) => {
    const outletReports = reports.filter((report) => report.outlet === outlet);
    const average =
      outletReports.length > 0
        ? Math.round(
            outletReports.reduce((sum, report) => sum + report.progress, 0) / outletReports.length
          )
        : 0;

    return {
      outlet: outlet.replace("KOV ", ""),
      progress: average,
    };
  });
}

export function getOutletTaskFormBreakdown(
  reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS
) {
  const forms = Array.from(new Set(reports.map((report) => report.form)));

  return forms.map((form) => ({
    name: form,
    value: reports.filter((report) => report.form === form).length,
  }));
}

export function getOutletTaskCompletionTrend(
  reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS
) {
  const summary = getOutletTaskFormSummary(reports);

  return [
    { day: "Mon", completion: 82, submitted: 14 },
    { day: "Tue", completion: 88, submitted: 18 },
    { day: "Wed", completion: 91, submitted: 21 },
    { day: "Thu", completion: 86, submitted: 17 },
    {
      day: "Today",
      completion: summary.averageProgress,
      submitted: summary.completed,
    },
  ];
}

export function getOutletTaskOutlets(reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS) {
  return Array.from(new Set(reports.map((report) => report.outlet)));
}

export function getOutletTaskForms(reports: OutletTaskFormReport[] = OUTLET_TASK_FORM_REPORTS) {
  return Array.from(new Set(reports.map((report) => report.form)));
}
