"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { useActiveFormTemplates } from "@/features/forms/hooks/use-form-templates";
import { getFormCategoryLabel } from "@/features/forms/constants/form-categories";
import { getIdentityOutlets, getIdentityUsers } from "@/services/identity.service";
import {
  applyAssigneeSelection,
  buildAssigneeOptions,
  resolveAssigneeSelection,
  type AssigneeSelection,
} from "@/features/tasks/utils/assignee-options";
import {
  TaskFormState,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
  TaskWeeklyPublishDay,
} from "@/features/tasks/types";
import { queryKeys } from "@/lib/query/keys";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { taskService } from "@/services/task.service";

type TaskFormDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  /** task = one-shot execution item; schedule = recurring publish rule */
  variant?: "task" | "schedule";
  form: TaskFormState;
  onClose: () => void;
  onChange: (form: TaskFormState) => void;
  onSubmit: () => void;
};

const statuses: TaskStatus[] = ["Pending", "In Progress", "Completed"];
const priorities: TaskPriority[] = ["Low", "Medium", "High", "Critical"];
const recurrences: Array<{ value: TaskRecurrence; label: string }> = [
  { value: "once", label: "One-time task" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
const recurringRecurrences = recurrences.filter((recurrence) => recurrence.value !== "once");
const weeklyPublishDayOptions: Array<{ value: TaskWeeklyPublishDay; label: string }> = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];

export function TaskFormDrawer({
  open,
  mode,
  variant = "task",
  form,
  onClose,
  onChange,
  onSubmit,
}: TaskFormDrawerProps) {
  const isEditMode = mode === "edit";
  const isScheduleVariant = variant === "schedule";
  const { settings } = useSettings();
  const defaultPublishTime = settings?.default_task_due_time ?? "09:00";
  const defaultOverdueTime = "17:00";
  const identityOutletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    retry: false,
  });
  const identityUsersQuery = useQuery({
    queryKey: queryKeys.identity.users,
    queryFn: getIdentityUsers,
    retry: false,
  });
  const { activeTemplates: availableTemplates } = useActiveFormTemplates();
  const safeFormTemplateId = form.formTemplateId || availableTemplates[0]?.id || "";
  const selectedTemplate = availableTemplates.find(
    (template) => template.id === safeFormTemplateId
  );

  useEffect(() => {
    if (!open) return;

    if (isScheduleVariant && !isEditMode && form.recurrence === "once") {
      onChange({
        ...form,
        recurrence: "daily",
        autoPublish: true,
        publishTime: form.publishTime || defaultPublishTime,
        dueTime: form.dueTime || defaultOverdueTime,
        shifts: [],
      });
      return;
    }

    if (!isScheduleVariant && form.recurrence !== "once") {
      onChange({
        ...form,
        recurrence: "once",
        autoPublish: false,
        shifts: [],
      });
    }
  }, [open, isScheduleVariant, form.recurrence]);

  useEffect(() => {
    if (!open || isEditMode || form.formTemplateId || availableTemplates.length === 0) {
      return;
    }

    const defaultTemplate = availableTemplates[0];
    onChange({
      ...form,
      formTemplateId: defaultTemplate.id,
      title: form.title || defaultTemplate.name,
      description: form.description || defaultTemplate.description || "",
    });
  }, [open, isEditMode, form, onChange, availableTemplates]);
  const outletOptions = useMemo(() => {
    const identityOutlets = identityOutletsQuery.data ?? [];

    return identityOutlets.map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
    }));
  }, [identityOutletsQuery.data]);
  const selectedTargetOutlets =
    form.targetOutlets.length > 0
      ? form.targetOutlets
      : [form.outlet ?? outletOptions[0]?.name ?? ""];
  const selectedTargetOutletIds =
    form.targetOutletIds && form.targetOutletIds.length > 0
      ? form.targetOutletIds
      : form.outletId
        ? [form.outletId]
        : outletOptions[0]?.id
          ? [outletOptions[0].id]
          : [];
  const primaryOutletId = selectedTargetOutletIds[0] ?? "";
  const outletMembersQuery = useQuery({
    queryKey: ["tasks", "outlet-members", primaryOutletId],
    queryFn: () => taskService.listOutletMembers(primaryOutletId),
    enabled: Boolean(primaryOutletId),
    retry: false,
  });
  const assigneeOptions = useMemo(
    () =>
      buildAssigneeOptions({
        identityUsers: identityUsersQuery.data ?? [],
        outletMembers: outletMembersQuery.data ?? [],
        selectedOutletIds: selectedTargetOutletIds.filter(Boolean),
      }),
    [identityUsersQuery.data, outletMembersQuery.data, selectedTargetOutletIds]
  );
  const assigneeSelection = resolveAssigneeSelection({
    assignedToId: form.assignedToId,
    assignee: form.assignee,
    assigneeSelection: form.assigneeSelection,
  });
  const isDailyTask = form.recurrence === "daily";
  const isWeeklyTask = form.recurrence === "weekly";
  const isMonthlyTask = form.recurrence === "monthly";
  const autoPublishTaskCount = form.autoPublish ? selectedTargetOutlets.length : 0;

  const canSubmit =
    Boolean(form.title?.trim()) &&
    Boolean((form.assignee ?? "Outlet Team").trim()) &&
    (form.recurrence === "once"
      ? Boolean(form.due?.trim())
      : Boolean((form.publishTime || defaultPublishTime).trim()) &&
        Boolean((form.dueTime || defaultOverdueTime).trim()) &&
        (form.recurrence !== "weekly" || Boolean(form.weeklyPublishDay)) &&
        (form.recurrence !== "monthly" || Boolean(form.monthlyPublishDay))) &&
    Boolean(safeFormTemplateId.trim()) &&
    (form.recurrence === "once" ? outletOptions.length > 0 : selectedTargetOutlets.length > 0);

  function toggleTargetOutlet(outletId: string, outletName: string) {
    const selected = selectedTargetOutletIds.includes(outletId);
    const nextTargetOutletIds = selected
      ? selectedTargetOutletIds.filter((id) => id !== outletId)
      : [...selectedTargetOutletIds, outletId];
    const nextTargetOutlets = selected
      ? selectedTargetOutlets.filter((name) => name !== outletName)
      : [...selectedTargetOutlets, outletName];

    onChange({
      ...form,
      outlet: nextTargetOutlets[0] ?? outletName,
      outletId: nextTargetOutletIds[0] ?? outletId,
      targetOutlets: nextTargetOutlets,
      targetOutletIds: nextTargetOutletIds,
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
                {isScheduleVariant
                  ? isEditMode
                    ? "Schedule Update"
                    : "Schedule Creation"
                  : isEditMode
                    ? "Task Update"
                    : "Task Creation"}
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                {isScheduleVariant
                  ? isEditMode
                    ? "Edit Schedule"
                    : "New Schedule"
                  : isEditMode
                    ? "Edit Task"
                    : "Create Task"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isScheduleVariant
                  ? "Atur SOP recurring yang auto-publish ke outlet."
                  : "Buat task sekali jalan untuk outlet yang dipilih."}
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
                  {getFormCategoryLabel(selectedTemplate.category)} -{" "}
                  {selectedTemplate.fields.length} fields
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
              placeholder={
                isScheduleVariant ? "Contoh: Daily opening checklist" : "Contoh: Project audit outlet"
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600"
            />
          </div>

          <div className={`grid gap-4 ${isEditMode ? "sm:grid-cols-2" : ""}`}>
            {isEditMode ? (
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
            ) : null}

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
            <select
              value={assigneeSelection}
              onChange={(event) => {
                const selection = event.target.value as AssigneeSelection;
                const nextAssignee = applyAssigneeSelection(selection, assigneeOptions);

                onChange({
                  ...form,
                  assigneeSelection: selection,
                  assignedToId: nextAssignee.assignedToId,
                  assignee: nextAssignee.assignee,
                });
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
            >
              {assigneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Pilih tim outlet, area manager, atau user spesifik. Default: Outlet Team.
            </p>
          </div>

          <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-950">
                  {isScheduleVariant ? "Recurring schedule" : "Due schedule"}
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  {isScheduleVariant
                    ? "Pilih frekuensi publish. Task one-shot dibuat dari menu Tasks."
                    : "Task sekali jalan langsung masuk outlet. Untuk SOP recurring, buat di menu Schedules."}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                {isScheduleVariant ? "Auto Publish" : "One-time"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {isScheduleVariant ? (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Frequency
                  </label>
                  <select
                    value={form.recurrence === "once" ? "daily" : form.recurrence}
                    onChange={(event) => {
                      const recurrence = event.target.value as TaskRecurrence;

                      onChange({
                        ...form,
                        recurrence,
                        autoPublish: true,
                        publishTime: form.publishTime || defaultPublishTime,
                        dueTime: form.dueTime || defaultOverdueTime,
                        shifts: [],
                        weeklyPublishDay:
                          recurrence === "weekly" ? form.weeklyPublishDay : "sunday",
                        monthlyPublishDay:
                          recurrence === "monthly"
                            ? form.monthlyPublishDay || 1
                            : form.monthlyPublishDay,
                      });
                    }}
                    className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                  >
                    {recurringRecurrences.map((recurrence) => (
                      <option key={recurrence.value} value={recurrence.value}>
                        {recurrence.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {!isScheduleVariant ? (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Due Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.due ?? ""}
                    onChange={(event) => onChange({ ...form, due: event.target.value })}
                    className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              ) : null}
            </div>

            {isScheduleVariant ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Publish Time
                  </label>
                  <input
                    type="time"
                    value={form.publishTime || defaultPublishTime}
                    onChange={(event) => onChange({ ...form, publishTime: event.target.value })}
                    className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">Kapan task muncul di outlet.</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                    Due / Overdue Time
                  </label>
                  <input
                    type="time"
                    value={form.dueTime || defaultOverdueTime}
                    onChange={(event) => onChange({ ...form, dueTime: event.target.value })}
                    className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Setelah jam ini task dianggap overdue.
                  </p>
                </div>
              </div>
            ) : null}

            {isScheduleVariant && form.recurrence === "weekly" ? (
              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Publish Day
                </label>
                <select
                  value={form.weeklyPublishDay ?? "sunday"}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      weeklyPublishDay: event.target.value as TaskWeeklyPublishDay,
                    })
                  }
                  className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {weeklyPublishDayOptions.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {isScheduleVariant && form.recurrence === "monthly" ? (
              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Publish Date (day of month)
                </label>
                <select
                  value={String(form.monthlyPublishDay ?? 1)}
                  onChange={(event) =>
                    onChange({
                      ...form,
                      monthlyPublishDay: Number(event.target.value),
                    })
                  }
                  className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {!isScheduleVariant ? (
              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Outlet
                </label>
                <select
                  value={form.outletId || outletOptions[0]?.id || ""}
                  onChange={(event) => {
                    const selectedOutlet = outletOptions.find(
                      (outlet) => outlet.id === event.target.value
                    );

                    onChange({
                      ...form,
                      outlet: selectedOutlet?.name ?? "",
                      outletId: selectedOutlet?.id ?? "",
                      targetOutlets: selectedOutlet?.name ? [selectedOutlet.name] : [],
                      targetOutletIds: selectedOutlet?.id ? [selectedOutlet.id] : [],
                    });
                  }}
                  className="mt-2 h-10 w-full rounded-xl border border-emerald-100 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  {outletOptions.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {isScheduleVariant ? (
              <div className="mt-4 rounded-xl bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Publish output
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-950">{autoPublishTaskCount}</p>
                <p className="text-xs text-slate-500">
                  {isWeeklyTask || isMonthlyTask || isDailyTask
                    ? "tasks per publish cycle (1 per outlet)"
                    : "tasks per publish"}
                </p>
              </div>
            ) : null}

            {isScheduleVariant ? (
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
                      key={outlet.id}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                    >
                      {outlet.name}
                      <input
                        type="checkbox"
                        checked={selectedTargetOutletIds.includes(outlet.id)}
                        onChange={() => toggleTargetOutlet(outlet.id, outlet.name)}
                        className="size-4 accent-emerald-700"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
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
            {isEditMode ? "Save Changes" : isScheduleVariant ? "Create Schedule" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
