"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { formTemplates } from "@/features/forms/data/mock-form-templates";
import { queryKeys } from "@/lib/query/keys";
import { formTemplateService } from "@/services/form-template.service";
import { TaskFormState, TaskPriority, TaskStatus } from "@/features/tasks/types";

type TaskFormDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  form: TaskFormState;
  onClose: () => void;
  onChange: (form: TaskFormState) => void;
  onSubmit: () => void;
};

const statuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const priorities: TaskPriority[] = ["Low", "Medium", "High"];
const outlets = ["KOV Montre", "KOV Heritage", "KOV Sultan Agung", "KOV Sula"];

export function TaskFormDrawer({
  open,
  mode,
  form,
  onClose,
  onChange,
  onSubmit,
}: TaskFormDrawerProps) {
  const isEditMode = mode === "edit";
  const backendTemplatesQuery = useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
    retry: false,
  });
  const availableTemplates = useMemo(() => {
    const backendTemplates = backendTemplatesQuery.data ?? [];
    const backendTemplateIds = new Set(backendTemplates.map((template) => template.id));

    return [
      ...backendTemplates,
      ...formTemplates.filter((template) => !backendTemplateIds.has(template.id)),
    ];
  }, [backendTemplatesQuery.data]);
  const safeFormTemplateId = form.formTemplateId || availableTemplates[0]?.id || "";
  const selectedTemplate = availableTemplates.find((template) => template.id === safeFormTemplateId);

  const canSubmit =
    Boolean(form.title?.trim()) &&
    Boolean(form.assignee?.trim()) &&
    Boolean(form.due?.trim()) &&
    Boolean(safeFormTemplateId.trim());

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                {isEditMode ? "SOP Task Update" : "SOP Task Creation"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {isEditMode ? "Edit SOP Task" : "Create SOP Task"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Assign reusable checklists, audits, and evidence forms to outlet teams.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <label className="text-sm font-semibold text-slate-700">SOP Form Template</label>
            <select
              value={safeFormTemplateId}
              onChange={(event) => {
                const template = availableTemplates.find((item) => item.id === event.target.value);

                onChange({
                  ...form,
                  formTemplateId: event.target.value,
                  title: form.title || template?.name || "",
                  description: form.description || template?.description || "",
                });
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>

            {selectedTemplate ? (
              <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">
                  {selectedTemplate.category} - {selectedTemplate.fields.length} fields
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  {selectedTemplate.description}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">SOP Task Title</label>
            <input
              value={form.title ?? ""}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              placeholder="Contoh: Daily opening checklist"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Outlet</label>
            <select
              value={form.outlet ?? "KOV Montre"}
              onChange={(event) => onChange({ ...form, outlet: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              {outlets.map((outlet) => (
                <option key={outlet} value={outlet}>
                  {outlet}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select
                value={form.status ?? "Pending"}
                onChange={(event) =>
                  onChange({
                    ...form,
                    status: event.target.value as TaskStatus,
                  })
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Priority</label>
              <select
                value={form.priority ?? "Medium"}
                onChange={(event) =>
                  onChange({
                    ...form,
                    priority: event.target.value as TaskPriority,
                  })
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Assignee</label>
            <input
              value={form.assignee ?? ""}
              onChange={(event) => onChange({ ...form, assignee: event.target.value })}
              placeholder="Contoh: Outlet Team"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Due Date & Time</label>
            <input
              type="datetime-local"
              value={form.due ?? ""}
              onChange={(event) => onChange({ ...form, due: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              value={form.description ?? ""}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              placeholder="Detail instruksi SOP untuk outlet."
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 p-6">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isEditMode ? "Save Changes" : "Create SOP Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

