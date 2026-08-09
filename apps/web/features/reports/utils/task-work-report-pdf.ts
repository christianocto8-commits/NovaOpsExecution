import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { FormField, FormTemplate } from "@/features/forms/types";
import type { Task, TaskShift } from "@/features/tasks/types";
import { isTaskExpiredOverdue, isTaskWorkedOn } from "@/features/tasks/utils/task-inbox";
import { collectSubmissionEvidenceItems } from "@/shared/evidence/submission-evidence";
import { getOfflineEvidenceBlobUrl, isOfflineEvidenceUrl } from "@/lib/offline/offline-evidence";

type OutletWorkReportParams = {
  outlet: string;
  tasks: Task[];
  templates: FormTemplate[];
  subtitle?: string;
};

const SHIFT_LABELS: Record<TaskShift, string> = {
  morning: "Pagi",
  evening: "Sore",
  midnight: "Malam",
};

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTemplateForTask(task: Task, templates: FormTemplate[]) {
  if (!task.formTemplateId) return null;
  return (
    templates.find(
      (template) =>
        template.id === task.formTemplateId ||
        template.id === String(task.formTemplateId) ||
        String(template.id) === task.formTemplateId
    ) ?? null
  );
}

function inferShiftFromDueValue(dueValue?: string): TaskShift {
  if (!dueValue) return "evening";

  const timeMatch = dueValue.match(/(\d{2}):(\d{2})/);
  if (!timeMatch) return "evening";

  const hour = Number(timeMatch[1]);
  if (hour < 12) return "morning";
  if (hour < 18) return "evening";
  return "midnight";
}

function getTaskShift(task: Task): TaskShift {
  return task.shifts?.[0] ?? inferShiftFromDueValue(task.dueTime ?? task.due);
}

function formatShiftLabel(shift: TaskShift) {
  return SHIFT_LABELS[shift] ?? shift;
}

function formatDateLabel(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export { isTaskWorkedOn };

export function filterWorkedTasksForOutlet(tasks: Task[], outlet: string) {
  return tasks
    .filter((task) => task.outlet === outlet && isTaskWorkedOn(task))
    .sort((left, right) => {
      const leftTime = new Date(left.execution?.completedAt ?? left.due).getTime();
      const rightTime = new Date(right.execution?.completedAt ?? right.due).getTime();
      return rightTime - leftTime;
    });
}

export function countWorkedTasksForOutlet(tasks: Task[], outlet: string) {
  return filterWorkedTasksForOutlet(tasks, outlet).length;
}

function formatStatusLabel(task: Task) {
  if (isTaskExpiredOverdue(task)) return "Overdue - tidak dikerjakan";
  if (isTaskWorkedOn(task)) return "Selesai";
  if (task.executionDraft) return "Draft tersimpan";
  if (task.status === "In Progress") return "Sedang dikerjakan";
  return task.status;
}

function formatResponseValue(value: string | undefined, field?: FormField) {
  if (!value?.trim()) return "-";

  if (field?.type === "photo" || value.startsWith("http") || value.startsWith("offline://")) {
    return "Foto terlampir";
  }

  if (field?.type === "signature") {
    return "Tanda tangan tersimpan";
  }

  if (field?.type === "yes_no") {
    const normalized = value.trim().toLowerCase();
    if (
      normalized === "yes" ||
      normalized === "ya" ||
      normalized === "true" ||
      normalized === "1"
    ) {
      return "Ya";
    }
    if (
      normalized === "no" ||
      normalized === "tidak" ||
      normalized === "false" ||
      normalized === "0"
    ) {
      return "Tidak";
    }
    if (normalized === "n/a" || normalized === "na" || normalized === "tidak berlaku") {
      return "Tidak Berlaku";
    }
  }

  if (field?.type === "money_denomination") {
    try {
      const parsed = JSON.parse(value) as Record<string, number>;
      return Object.entries(parsed)
        .map(([denomination, count]) => `${denomination} x ${count}`)
        .join("; ");
    } catch {
      return value;
    }
  }

  return value;
}

function getExecutionResponses(task: Task) {
  return task.execution?.formResponses ?? task.executionDraft?.formResponses ?? {};
}

function getOperatorName(task: Task) {
  return task.execution?.operatorName ?? task.executionDraft?.operatorName ?? task.assignee ?? "-";
}

function getOperatorPosition(task: Task) {
  return task.execution?.operatorPosition ?? task.executionDraft?.operatorPosition ?? "-";
}

function getTaskNote(task: Task) {
  return task.execution?.note ?? task.executionDraft?.note ?? "-";
}

function getEvidencePayload(task: Task) {
  const draftEvidence = task.executionDraft?.evidenceText;
  if (typeof draftEvidence === "string" && draftEvidence.trim()) {
    return draftEvidence;
  }

  const executionEvidence = task.execution?.evidence ?? [];
  if (executionEvidence.length === 1 && executionEvidence[0]?.value) {
    return executionEvidence[0].value;
  }

  return executionEvidence;
}

function getEvidenceSummary(task: Task) {
  const items = collectSubmissionEvidenceItems({
    evidencePayload: getEvidencePayload(task),
    formResponses: getExecutionResponses(task),
    taskEvidence: task.execution?.evidence,
  });

  if (items.length > 0) {
    return `${items.length} foto bukti terlampir`;
  }

  return "-";
}

function getCompletedAt(task: Task) {
  if (isTaskExpiredOverdue(task)) return "Tidak disubmit";
  return task.execution?.completedAt ?? "-";
}

function buildTaskResultRows(task: Task, template: FormTemplate | null) {
  if (isTaskExpiredOverdue(task)) {
    return [
      ["Status", "Overdue"],
      ["Hasil", "Task tidak dikerjakan sampai batas waktu berakhir"],
    ];
  }

  const responses = getExecutionResponses(task);

  if (template && template.fields.length > 0) {
    return template.fields.map((field) => [
      field.label,
      formatResponseValue(responses[field.id], field),
    ]);
  }

  const responseEntries = Object.entries(responses);
  if (responseEntries.length > 0) {
    return responseEntries.map(([fieldId, value]) => [fieldId, formatResponseValue(value)]);
  }

  return [["Ringkasan pekerjaan", getTaskNote(task)]];
}

function getTaskEvidencePhotos(task: Task) {
  return collectSubmissionEvidenceItems({
    evidencePayload: getEvidencePayload(task),
    formResponses: getExecutionResponses(task),
    taskEvidence: task.execution?.evidence,
  });
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};

  const token = localStorage.getItem("novaops_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function resolvePhotoDataUrl(url: string): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (isOfflineEvidenceUrl(trimmed)) {
    return getOfflineEvidenceBlobUrl(trimmed);
  }

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  try {
    const response = await fetch(trimmed, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function detectImageFormat(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

async function appendEvidencePhotos(doc: jsPDF, task: Task, startY: number): Promise<number> {
  const photos = getTaskEvidencePhotos(task);
  if (photos.length === 0) return startY;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 28;
  let cursorY = startY + 8;

  doc.setFontSize(10);
  doc.text("Foto Bukti", 14, cursorY);
  cursorY += 6;

  for (const [index, photo] of photos.entries()) {
    const dataUrl = await resolvePhotoDataUrl(photo.url);
    if (!dataUrl) continue;

    let imgWidth = contentWidth;
    let imgHeight = 52;

    try {
      const props = doc.getImageProperties(dataUrl);
      imgHeight = (props.height * imgWidth) / props.width;
      if (imgHeight > 70) {
        imgHeight = 70;
        imgWidth = (props.width * imgHeight) / props.height;
      }
    } catch {
      imgHeight = 52;
    }

    if (cursorY + imgHeight > pageHeight - 16) {
      doc.addPage();
      cursorY = 20;
    }

    const caption = photo.caption?.trim() || `Bukti ${index + 1}`;
    doc.setFontSize(8);
    doc.text(caption, 14, cursorY);
    cursorY += 4;

    try {
      doc.addImage(
        dataUrl,
        detectImageFormat(dataUrl),
        14,
        cursorY,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      cursorY += imgHeight + 8;
    } catch {
      doc.setFontSize(8);
      doc.text("(Foto tidak dapat dimuat)", 14, cursorY);
      cursorY += 8;
    }
  }

  return cursorY;
}

function drawDocumentHeader(doc: jsPDF, outlet: string, subtitle?: string) {
  const generatedAt = new Date().toLocaleString("id-ID");

  doc.setFontSize(18);
  doc.text("NovaOps — Laporan Hasil Pekerjaan", 14, 16);

  doc.setFontSize(12);
  doc.text(`Outlet: ${outlet}`, 14, 25);

  doc.setFontSize(9);
  if (subtitle) {
    doc.text(subtitle, 14, 32);
    doc.text(`Dibuat: ${generatedAt}`, 14, 38);
    doc.text("Dokumen operasional — rahasia internal", 14, 44);
    return 52;
  }

  doc.text(`Dibuat: ${generatedAt}`, 14, 32);
  doc.text("Dokumen operasional — rahasia internal", 14, 38);
  return 46;
}

async function renderTaskWorkReportSection(
  doc: jsPDF,
  task: Task,
  templates: FormTemplate[],
  startY: number
) {
  const template = getTemplateForTask(task, templates);
  const pageHeight = doc.internal.pageSize.getHeight();
  let cursorY = startY;

  if (cursorY > pageHeight - 60) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setFillColor(247, 250, 248);
  doc.roundedRect(14, cursorY - 4, doc.internal.pageSize.getWidth() - 28, 10, 2, 2, "F");
  doc.setFontSize(11);
  doc.setTextColor(39, 71, 51);
  doc.text(task.title, 16, cursorY + 2);
  doc.setTextColor(0, 0, 0);
  cursorY += 12;

  autoTable(doc, {
    startY: cursorY,
    head: [["Informasi Task", "Detail"]],
    body: [
      ["Template Form", template?.name ?? "-"],
      ["Shift", formatShiftLabel(getTaskShift(task))],
      ["Jatuh Tempo", formatDateLabel(task.due)],
      ["Status", formatStatusLabel(task)],
      ["Operator", getOperatorName(task)],
      ["Posisi", getOperatorPosition(task)],
      ["Waktu Selesai", formatDateLabel(getCompletedAt(task))],
      ["Bukti / Evidence", getEvidenceSummary(task)],
      ["Catatan", getTaskNote(task)],
    ],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: [61, 107, 73],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold" },
      1: { cellWidth: "auto" },
    },
  });

  cursorY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
  cursorY += 6;

  doc.setFontSize(10);
  doc.text("Hasil Pekerjaan / Checklist", 14, cursorY);
  cursorY += 4;

  autoTable(doc, {
    startY: cursorY,
    head: [["Item Pekerjaan", "Hasil"]],
    body: buildTaskResultRows(task, template),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: {
      fillColor: [39, 71, 51],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: "auto" },
    },
  });

  cursorY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY;
  return appendEvidencePhotos(doc, task, cursorY + 4);
}

function addPageFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.text("Generated by NovaOps", 14, pageHeight - 8);
    doc.text(`Halaman ${page}/${pageCount}`, pageWidth - 32, pageHeight - 8);
  }
}

export async function exportOutletWorkReportPdf({
  outlet,
  tasks,
  templates,
  subtitle,
}: OutletWorkReportParams) {
  const workedTasks = filterWorkedTasksForOutlet(tasks, outlet);

  if (workedTasks.length === 0) {
    throw new Error("Belum ada task yang dikerjakan untuk outlet ini.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let cursorY = drawDocumentHeader(
    doc,
    outlet,
    subtitle ?? `${workedTasks.length} task dengan hasil pekerjaan`
  );

  for (const [index, task] of workedTasks.entries()) {
    if (index > 0) {
      doc.addPage();
      cursorY = 20;
    }

    cursorY = (await renderTaskWorkReportSection(doc, task, templates, cursorY)) + 12;
  }

  addPageFooters(doc);
  doc.save(`laporan-pekerjaan-${sanitizeFileName(outlet)}.pdf`);
}

export async function exportSingleTaskWorkReportPdf(task: Task, templates: FormTemplate[]) {
  if (!isTaskWorkedOn(task)) {
    throw new Error("Task belum memiliki hasil pekerjaan yang bisa diexport.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  drawDocumentHeader(doc, task.outlet, `Task: ${task.title}`);
  await renderTaskWorkReportSection(doc, task, templates, 52);
  addPageFooters(doc);
  doc.save(`laporan-task-${sanitizeFileName(task.title)}-${sanitizeFileName(task.outlet)}.pdf`);
}
