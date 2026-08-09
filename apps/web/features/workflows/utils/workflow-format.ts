import type { WorkflowDefinition } from "@/features/workflows/types";

export function formatWorkflowDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export function getWorkflowStatusTone(status?: string | null) {
  const normalized = String(status ?? "").toLowerCase();

  if (["active", "published", "enabled"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["draft", "pending"].includes(normalized)) {
    return "bg-amber-50 text-amber-700";
  }

  if (["inactive", "disabled", "archived"].includes(normalized)) {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-blue-50 text-blue-700";
}

export function getWorkflowMetrics(workflows: WorkflowDefinition[]) {
  const total = workflows.length;

  const active = workflows.filter((workflow) => {
    const status = String(workflow.status ?? "").toLowerCase();
    return workflow.is_active === true || status === "active";
  }).length;

  const draft = workflows.filter(
    (workflow) => String(workflow.status ?? "").toLowerCase() === "draft"
  ).length;

  const inactive = workflows.filter((workflow) => {
    const status = String(workflow.status ?? "").toLowerCase();
    return workflow.is_active === false || ["inactive", "archived", "disabled"].includes(status);
  }).length;

  return {
    total,
    active,
    draft,
    inactive,
  };
}
