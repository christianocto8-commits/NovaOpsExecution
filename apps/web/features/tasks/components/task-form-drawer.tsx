"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { getAvailableFormTemplates } from "@/features/forms/data/form-template-store";
import { mockOutlets } from "@/features/outlets/data/outlets-data";
import { queryKeys } from "@/lib/query/keys";
import { formTemplateService } from "@/services/form-template.service";
import { getIdentityOutlets } from "@/services/identity.service";
import {
  TaskFormState,
  TaskPriority,
  TaskRecurrence,
  TaskShift,
  TaskStatus,
} from "@/features/tasks/types";

type TaskFormDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  form: TaskFormState;
  onClose: () => void;
  onChange: (form: TaskFormState) => void;
  onSubmit: () => void;
};

const statuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const priorities: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
const recurrences: Array<{ value: TaskRecurrence; label: string }> = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];
const shiftOptions: Array<{ value: TaskShift; label: string; time: string }> = [
  { value: "morning", label: "Morning", time: "07:00" },
  { value: "evening", label: "Evening", time: "15:00" },
  { value: "midnight", label: "Midnight", time: "23:00" },
];

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
  const identityOutletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    retry: false,
  });
  const backendTemplates = backendTemplatesQuery.data ?? [];
  const backendTemplateIds = new Set(backendTemplates.map((template) => template.id));
  const availableTemplates = [
    ...backendTemplates,
    ...getAvailableFormTemplates().filter((template) => !backendTemplateIds.has(template.id)),
  ].filter((template) => template.status !== "Draft");
  const safeFormTemplateId = form.formTemplateId || availableTemplates[0]?.id || "";
  const selectedTemplate = availableTemplates.find(
    (template) => template.id === safeFormTemplateId
  );
  const outletOptions = useMemo(() => {
    const identityOutlets = identityOutletsQuery.data ?? [];
    const sourceOutlets = identityOutlets.length > 0 ? identityOutlets : mockOutlets;

    return sourceOutlets.map((outlet) => outlet.name);
  }, [identityOutletsQuery.data]);
  const selectedTargetOutlets =
    form.targetOutlets.length > 0 ? form.targetOutlets : [form.outlet ?? outletOptions[0] ?? ""];
  const selectedShiftCount = form.shifts.length;
  const autoPublishTaskCount = form.autoPublish
    ? selectedTargetOutlets.length * selectedShiftCount
    : 0;

  const canSubmit =
    Boolean(form.title?.trim()) &&
    Boolean(form.assignee?.trim()) &&
    Boolean(form.due?.trim()) &&
    Boolean(safeFormTemplateId.trim()) &&
    (!form.autoPublish || (selectedTargetOutlets.length > 0 && selectedShiftCount > 0));

  function toggleTargetOutlet(outletName: string) {
    const selected = selectedTargetOutlets.includes(outletName);
    const nextTargetOutlets = selected
      ? selectedTargetOutlets.filter((name) => name !== outletName)
      : [...selectedTargetOutlets, outletName];

    onChange({
      ...form,
      outlet: nextTargetOutlets[0] ?? outletName,
      targetOutlets: nextTargetOutlets,
    });
  }

  function toggleShift(shift: TaskShift) {
    const selected = form.shifts.includes(shift);
    const nextShifts = selected
      ? form.shifts.filter((currentShift) => currentShift !== shift)
      : [...form.shifts, shift];

    onChange({
      ...form,
      shifts: nextShifts,
    });
  }

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
                {isEditMode ? "Task Update" : "Task Creation"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {isEditMode ? "Edit Task" : "Create Task"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Assign reusable form templates and evidence requirements to outlet teams.
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
            <label className="text-sm font-semibold text-slate-700">Form Template</label>
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
            <label className="text-sm font-semibold text-slate-700">Task Title</label>
            <input
              value={form.title ?? ""}
              onChange={(event) => onChange({ ...form, title: event.target.value })}
              placeholder="Contoh: Daily opening checklist"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
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

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-950">Auto Publish</p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  Schedule daily or weekly tasks for selected outlet shifts.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800">
                <input
                  type="checkbox"
                  checked={form.autoPublish}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      autoPublish: event.target.checked,
                      recurrence: event.target.checked ? form.recurrence : "once",
                    })
                  }
                  className="size-4 accent-emerald-700"
                />
                Enabled
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Frequency
                </label>
                <select
                  value={form.recurrence}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      recurrence: event.target.value as TaskRecurrence,
                      autoPublish: event.target.value !== "once" ? true : form.autoPublish,
                    })
                  }
                  className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {recurrences.map((recurrence) => (
                    <option key={recurrence.value} value={recurrence.value}>
                      {recurrence.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Daily output
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-950">{autoPublishTaskCount}</p>
                <p className="text-xs text-slate-500">tasks per scheduled publish</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Shifts</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {shiftOptions.map((shift) => (
                  <label
                    key={shift.value}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-semibold text-slate-900">{shift.label}</span>
                      <span className="ml-2 text-xs text-slate-500">{shift.time}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.shifts.includes(shift.value)}
                      onChange={() => toggleShift(shift.value)}
                      className="size-4 accent-emerald-700"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Target Outlets
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {outletOptions.length} existing
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {outletOptions.map((outlet) => (
                  <label
                    key={outlet}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    {outlet}
                    <input
                      type="checkbox"
                      checked={selectedTargetOutlets.includes(outlet)}
                      onChange={() => toggleTargetOutlet(outlet)}
                      className="size-4 accent-emerald-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

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
            {isEditMode ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
