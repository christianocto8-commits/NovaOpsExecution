"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";

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
import { useLanguage } from "@/shared/i18n";
import { useToast } from "@/shared/toast";

function toScheduleTask(schedule: BackendTaskSchedule, outletNameById: Record<string, string>) {
  const form = scheduleToFormState(schedule, outletNameById);

  return {
    id: String(schedule.id),
    title: schedule.title,
    outlet: form.targetOutlets.join(", ") || "-",
    status: schedule.is_active ? "Active" : "Inactive",
    priority: form.priority,
    assignee: form.assignee,
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
    monthlyPublishDay: form.monthlyPublishDay,
  };
}

function getPreviewDateLabel(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function SchedulesWorkspace() {
  const toast = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [closedDate, setClosedDate] = useState("");
  const [closedReason, setClosedReason] = useState("");
  const [scheduleExceptions, setScheduleExceptions] = useState<Array<{ date: string; reason: string }>>([]);
  const [scheduleForm, setScheduleForm] = useState<TaskFormState>({
    ...emptyTaskForm,
    recurrence: "daily",
    autoPublish: true,
    assignee: "Outlet Team",
  });
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
  }, []);

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
  const upcomingPreview = useMemo(() => {
    if (nowMs == null) return [];

    const sevenDays = nowMs + 7 * 24 * 60 * 60 * 1000;

    return (schedulesQuery.data ?? [])
      .filter((schedule) => schedule.is_active && schedule.next_publish_at)
      .map((schedule) => ({
        schedule,
        publishAt: new Date(schedule.next_publish_at as string),
        outletCount: schedule.outlet_ids_json.length,
      }))
      .filter(({ publishAt }) => {
        const time = publishAt.getTime();
        return !Number.isNaN(time) && time >= nowMs && time <= sevenDays;
      })
      .sort((first, second) => first.publishAt.getTime() - second.publishAt.getTime())
      .slice(0, 6);
  }, [nowMs, schedulesQuery.data]);
  const previewTaskCount = upcomingPreview.reduce(
    (sum, item) => sum + Math.max(1, item.outletCount),
    0
  );
  const scheduleConflicts = useMemo(() => {
    const buckets = new Map<string, { label: string; schedules: string[] }>();

    (schedulesQuery.data ?? []).forEach((schedule) => {
      if (!schedule.is_active || !schedule.next_publish_at) return;
      const publishAt = new Date(schedule.next_publish_at);
      if (Number.isNaN(publishAt.getTime())) return;
      const hourKey = publishAt.toISOString().slice(0, 13);

      schedule.outlet_ids_json.forEach((outletId) => {
        const key = `${outletId}:${hourKey}`;
        const label = `${outletNameById[String(outletId)] ?? `Outlet ${outletId}`} - ${publishAt.toLocaleString("id-ID")}`;
        const current = buckets.get(key) ?? { label, schedules: [] };
        current.schedules.push(schedule.title);
        buckets.set(key, current);
      });
    });

    return Array.from(buckets.values()).filter((bucket) => bucket.schedules.length > 1);
  }, [outletNameById, schedulesQuery.data]);
  const blockedPreviewCount = useMemo(
    () =>
      upcomingPreview.filter(({ schedule }) =>
        scheduleExceptions.some((exception) => {
          if (!schedule.next_publish_at) return false;
          return schedule.next_publish_at.slice(0, 10) === exception.date;
        })
      ).length,
    [scheduleExceptions, upcomingPreview]
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
      key: "assignee",
      header: "Assignee",
      render: (row) => row.assignee,
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
      assignedToId: null,
      assigneeSelection: "outlet_team",
      monthlyPublishDay: 1,
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
      toast.error("Schedule harus daily, weekly, atau monthly.");
      return;
    }

    if (scheduleForm.recurrence === "weekly" && !scheduleForm.weeklyPublishDay) {
      toast.error("Pilih hari publish untuk schedule weekly.");
      return;
    }

    if (scheduleForm.recurrence === "monthly" && !scheduleForm.monthlyPublishDay) {
      toast.error("Pilih tanggal publish untuk schedule monthly.");
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
              {t("schedules.eyebrow")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">{t("schedules.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("schedules.description")}</p>
          </div>

          <button
            type="button"
            onClick={openCreateSchedule}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="size-4" />
            {t("schedules.new")}
          </button>
        </div>
      </section>

      {scheduleConflicts.length > 0 ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-bold text-amber-950">Schedule conflict warning</p>
          <p className="mt-1 text-sm text-amber-800">
            Ada outlet yang menerima beberapa task pada jam publish yang sama. Pertimbangkan reschedule agar beban outlet tidak menumpuk.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {scheduleConflicts.slice(0, 4).map((conflict) => (
              <div key={conflict.label} className="rounded-2xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-bold text-amber-950">{conflict.label}</p>
                <p className="mt-1 text-xs text-amber-800">{conflict.schedules.join(", ")}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold text-slate-950">Holiday / store closed exceptions</p>
        <p className="mt-1 text-sm text-slate-500">
          Catat tanggal tutup untuk planning schedule. Preview publish pada tanggal ini akan diberi warning.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
          <input
            type="date"
            value={closedDate}
            onChange={(event) => setClosedDate(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={closedReason}
            onChange={(event) => setClosedReason(event.target.value)}
            placeholder="Reason, e.g. public holiday / store maintenance"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              if (!closedDate) return;
              setScheduleExceptions((current) => [
                { date: closedDate, reason: closedReason.trim() || "Store closed" },
                ...current.filter((item) => item.date !== closedDate),
              ]);
              setClosedDate("");
              setClosedReason("");
            }}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
          >
            Add exception
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {scheduleExceptions.length ? (
            scheduleExceptions.map((exception) => (
              <div key={exception.date} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-950">
                  {exception.date} - {exception.reason}
                </p>
                <button
                  type="button"
                  onClick={() => setScheduleExceptions((current) => current.filter((item) => item.date !== exception.date))}
                  className="text-xs font-bold text-amber-800"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Belum ada exception.</p>
          )}
        </div>
        {blockedPreviewCount > 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {blockedPreviewCount} upcoming schedule jatuh pada tanggal exception.
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-emerald-700" />
            <div>
              <p className="text-sm font-bold text-slate-950">7-day publish preview</p>
              <p className="mt-1 text-xs text-slate-500">
                {previewTaskCount} task akan dibuat dari schedule aktif yang sudah punya next publish.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            {upcomingPreview.length} schedule
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {upcomingPreview.length ? (
            upcomingPreview.map(({ schedule, outletCount }) => (
              <div key={schedule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {getPreviewDateLabel(schedule.next_publish_at)}
                </p>
                <p className="mt-1 font-bold text-slate-950">{schedule.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {outletCount} outlet - due {schedule.due_time}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
              Tidak ada publish schedule aktif dalam 7 hari ke depan.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarClock className="size-4 text-emerald-700" />
          {t("schedules.tableTitle")}
        </div>

        <EnterpriseDataTable
          columns={columns}
          data={rows}
          emptyTitle={
            schedulesQuery.isLoading ? "Loading schedules..." : t("schedules.emptyTitle")
          }
          emptyDescription={
            schedulesQuery.isLoading ? undefined : t("schedules.emptyDescription")
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
