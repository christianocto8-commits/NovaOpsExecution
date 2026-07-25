import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type RegulatorReportRow = {
  id: string;
  outlet: string;
  task: string;
  form: string;
  status: string;
  progress: number;
  score: number;
  operator: string;
  due: string;
  submittedAt: string;
};

export type RegulatorReportSummary = {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  averageProgress: number;
  averageScore: number;
};

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function exportRegulatorReportPacketPdf({
  rows,
  summary,
  periodLabel,
  outletLabel,
}: {
  rows: RegulatorReportRow[];
  summary: RegulatorReportSummary;
  periodLabel: string;
  outletLabel: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const generatedAt = new Date().toLocaleString("id-ID");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("NovaOps Compliance Packet", 40, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Period: ${periodLabel}`, 40, 62);
  doc.text(`Scope: ${outletLabel}`, 40, 76);
  doc.text(`Generated: ${generatedAt}`, 40, 90);

  autoTable(doc, {
    startY: 112,
    head: [["Metric", "Value"]],
    body: [
      ["Total worked tasks", String(summary.total)],
      ["Completed", String(summary.completed)],
      ["Open / in progress", String(summary.inProgress)],
      ["Overdue", String(summary.overdue)],
      ["Completion rate", `${summary.averageProgress}%`],
      ["Audit score", `${summary.averageScore}%`],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [4, 120, 87] },
  });

  const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 220,
    margin: { top: 20 },
    head: [["Status", "Count"]],
    body: Object.entries(statusCounts).map(([status, count]) => [status, String(count)]),
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 320,
    margin: { top: 20 },
    head: [["Outlet", "Task", "Status", "Score", "Operator", "Due", "Submitted"]],
    body: rows.map((row) => [
      row.outlet,
      row.task,
      row.status,
      `${row.score}%`,
      row.operator,
      row.due,
      row.submittedAt,
    ]),
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 4 },
    headStyles: { fillColor: [4, 120, 87] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 120 },
      2: { cellWidth: 54 },
      3: { cellWidth: 38 },
      4: { cellWidth: 76 },
      5: { cellWidth: 72 },
      6: { cellWidth: 72 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`NovaOps Compliance Packet - Page ${page} of ${pageCount}`, 40, 820);
  }

  doc.save(`novaops-compliance-packet-${sanitizeFileName(periodLabel)}.pdf`);
}
