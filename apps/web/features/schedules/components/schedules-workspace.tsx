"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";

import { useActiveFormTemplates } from "@/features/forms/hooks/use-form-templates";
import { TaskFormDrawer } from "@/features/tasks/components/task-form-drawer";
import { emptyTaskForm } from "@/features/tasks/data/task-form-defaults";
import type { TaskFormState } from "@/features/tasks/types";
import { formatTaskSchedule } from "@/features/tasks/utils";
import { queryKeys } from "@/lib/query/keys";
import { getIdentityOutlets } from "@/services/identity.service";
import {
  scheduleToFormState,
  taskScheduleService,
  type BackendTaskSchedule,
} from "@/services/task-schedule.service";
import { EnterpriseDataTable, type EnterpriseColumn } from "@/shared/data-table";
import { useToast } from "@/shared/toast";

function toScheduleTask(schedule: BackendTaskSchedule, outletNameById: Record<string, string>) {
  const form = scheduleToFormState(schedule, outletNameById);

  return {
    id: String(schedule.id),
    title: schedule.title,
    outlet: form.targetOutlets.join(", ") || "-",
    status: schedule.is_active ? "Active" : "Inactive",
    priority: form.priority,
    assignee: "Scheduled",
    due: schedule.next_publish_at
      ? new Date(schedule.next_publish_at).toLocaleString()
      : "Not scheduled",
    description: schedule.description ?? "",
    formTemplateId: form.formTemplateId,
    recurrence: form.recurrence,
    shifts: form.shifts,
    targetOutlets: form.targetOutlets,
    targetOutletIds: form.targetOutletIds,
    autoPublish: form.autoPublish,
    dueTime: form.dueTime,
    weeklyPublishDay: form.weeklyPublishDay,
  };
}

export function SchedulesWorkspace() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<TaskFormState>({
    ...emptyTaskForm,
    recurrence: "daily",
    autoPublish: true,
    assignee: "Outlet Team",
  });

  const schedulesQuery = useQuery({
    queryKey: ["task-schedules"],
    queryFn: () => taskScheduleService.list(),
    retry: false,
  });

  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    retry: false,
  });

  const { activeTemplates } = useActiveFormTemplates();

  const outletNameById = useMemo(() => {
    const map: Record<string, string> = {};
    (outletsQuery.data ?? []).forEach((outlet) => {
      map[outlet.id] = outlet.name;
    });
    return map;
  }, [outletsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingScheduleId) {
        return taskScheduleService.update(editingScheduleId, scheduleForm);
      }

      return taskScheduleService.create(scheduleForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-schedules"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ scheduleId, isActive }: { scheduleId: number; isActive: boolean }) =>
      taskScheduleService.setActive(scheduleId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-schedules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (scheduleId: number) => taskScheduleService.delete(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-schedules"] });
    },
  });

  const rows = useMemo(
    () => (schedulesQuery.data ?? []).map((schedule) => toScheduleTask(schedule, outletNameById)),
    [outletNameById, schedulesQuery.data]
  );

  const columns: EnterpriseColumn<(typeof rows)[number]>[] = [
    {
      key: "title",
      header: "Schedule",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-950">{row.title}</p>
          <p className="text-xs text-slate-500">{formatTaskSchedule(row)}</p>
        </div>
      ),
    },
    {
      key: "outlets",
      header: "Outlets",
      render: (row) => row.outlet,
    },
    {
      key: "template",
      header: "Template",
      render: (row) => {
        const template = activeTemplates.find((item) => item.id === row.formTemplateId);
        return template?.name ?? row.formTemplateId ?? "-";
      },
    },
    {
      key: "next",
      header: "Next Publish",
      render: (row) => row.due,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            row.status === "Active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const scheduleId = Number(row.id);
        const schedule = schedulesQuery.data?.find((item) => item.id === scheduleId);
        const isActive = schedule?.is_active ?? true;

        return (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openEditSchedule(scheduleId)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await toggleMutation.mutateAsync({ scheduleId, isActive: !isActive });
                  toast.success(isActive ? "Schedule dinonaktifkan." : "Schedule diaktifkan.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Gagal mengubah status schedule.");
                }
              }}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isActive ? "Deactivate" : "Activate"}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Hapus schedule ini?")) return;

                try {
                  await deleteMutation.mutateAsync(scheduleId);
                  toast.success("Schedule dihapus.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Gagal menghapus schedule.");
                }
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" />
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  function openCreateSchedule() {
    setEditingScheduleId(null);
    setScheduleForm({
      ...emptyTaskForm,
      recurrence: "daily",
      autoPublish: true,
      assignee: "Outlet Team",
      formTemplateId: activeTemplates[0]?.id ?? "",
      shifts: ["morning"],
    });
    setIsFormOpen(true);
  }

  function openEditSchedule(scheduleId: number) {
    const schedule = schedulesQuery.data?.find((item) => item.id === scheduleId);
    if (!schedule) return;

    setEditingScheduleId(scheduleId);
    setScheduleForm(scheduleToFormState(schedule, outletNameById));
    setIsFormOpen(true);
  }

  async function submitScheduleForm() {
    if (scheduleForm.recurrence === "once") {
      toast.error("Schedule harus daily atau weekly.");
      return;
    }

    if (scheduleForm.recurrence === "weekly" && !scheduleForm.weeklyPublishDay) {
      toast.error("Pilih hari publish untuk schedule weekly.");
      return;
    }

    if (
      scheduleForm.targetOutletIds?.length === 0 &&
      !scheduleForm.outletId
    ) {
      toast.error("Pilih minimal satu outlet.");
      return;
    }

    try {
      await saveMutation.mutateAsync();
      toast.success(editingScheduleId ? "Schedule diperbarui." : "Schedule dibuat.");
      setIsFormOpen(false);
      setEditingScheduleId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan schedule.");
    }
  }

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Schedule Management
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">Task Schedules</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Kelola jadwal task recurring harian/mingguan, template form, outlet target, dan status aktif.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateSchedule}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="size-4" />
            New Schedule
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarClock className="size-4 text-emerald-700" />
          Active and inactive recurring schedules
        </div>

        <EnterpriseDataTable
          columns={columns}
          data={rows}
          emptyMessage={
            schedulesQuery.isLoading
              ? "Loading schedules..."
              : "Belum ada task schedule. Buat schedule baru untuk publish task otomatis."
          }
          searchPlaceholder="Search schedule, outlet, template..."
        />
      </section>

      <TaskFormDrawer
        open={isFormOpen}
        mode={editingScheduleId ? "edit" : "create"}
        form={scheduleForm}
        onClose={() => {
          setIsFormOpen(false);
          setEditingScheduleId(null);
        }}
        onChange={setScheduleForm}
        onSubmit={() => {
          void submitScheduleForm();
        }}
      />
    </main>
  );
}
