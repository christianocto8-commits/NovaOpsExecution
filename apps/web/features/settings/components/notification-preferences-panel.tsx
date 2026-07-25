"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/notification-preferences.service";
import { useLanguage } from "@/shared/i18n";

const STORAGE_KEY = "novaops_notification_preferences";

type NotificationPreferences = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  digestEnabled: boolean;
  smsEnabled: boolean;
  taskIncomingEnabled: boolean;
  taskUpcomingEnabled: boolean;
  taskOverdueEnabled: boolean;
  taskCompletedEnabled: boolean;
  checklistFailedEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const defaults: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  digestEnabled: false,
  smsEnabled: false,
  taskIncomingEnabled: true,
  taskUpcomingEnabled: true,
  taskOverdueEnabled: true,
  taskCompletedEnabled: true,
  checklistFailedEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

function readLocalPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return defaults;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function toApiPayload(prefs: NotificationPreferences) {
  return {
    email_enabled: prefs.emailEnabled,
    push_enabled: prefs.pushEnabled,
    digest_enabled: prefs.digestEnabled,
    sms_enabled: prefs.smsEnabled,
    task_incoming_enabled: prefs.taskIncomingEnabled,
    task_upcoming_enabled: prefs.taskUpcomingEnabled,
    task_overdue_enabled: prefs.taskOverdueEnabled,
    task_completed_enabled: prefs.taskCompletedEnabled,
    checklist_failed_enabled: prefs.checklistFailedEnabled,
    quiet_hours_enabled: prefs.quietHoursEnabled,
    quiet_hours_start: prefs.quietHoursStart,
    quiet_hours_end: prefs.quietHoursEnd,
  };
}

function fromApiPayload(payload: {
  email_enabled: boolean;
  push_enabled: boolean;
  digest_enabled: boolean;
  sms_enabled?: boolean;
  task_incoming_enabled?: boolean;
  task_upcoming_enabled?: boolean;
  task_overdue_enabled?: boolean;
  task_completed_enabled?: boolean;
  checklist_failed_enabled?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}): NotificationPreferences {
  return {
    emailEnabled: payload.email_enabled,
    pushEnabled: payload.push_enabled,
    digestEnabled: payload.digest_enabled,
    smsEnabled: payload.sms_enabled ?? false,
    taskIncomingEnabled: payload.task_incoming_enabled ?? true,
    taskUpcomingEnabled: payload.task_upcoming_enabled ?? true,
    taskOverdueEnabled: payload.task_overdue_enabled ?? true,
    taskCompletedEnabled: payload.task_completed_enabled ?? true,
    checklistFailedEnabled: payload.checklist_failed_enabled ?? true,
    quietHoursEnabled: payload.quiet_hours_enabled ?? false,
    quietHoursStart: payload.quiet_hours_start ?? "22:00",
    quietHoursEnd: payload.quiet_hours_end ?? "07:00",
  };
}

function PreferenceToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="size-5 accent-emerald-700"
      />
    </label>
  );
}

export function NotificationPreferencesPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaults);
  const [saved, setSaved] = useState(false);

  const prefsQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: fetchNotificationPreferences,
    retry: false,
  });

  useEffect(() => {
    if (prefsQuery.data) {
      const next = fromApiPayload(prefsQuery.data);
      setPrefs(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return;
    }

    setPrefs(readLocalPreferences());
  }, [prefsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      const next = fromApiPayload(data);
      setPrefs(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      queryClient.setQueryData(["notification-preferences"], data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    },
  });

  function update<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    saveMutation.mutate(toApiPayload(next));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{t("notifications.prefs.title")}</h3>
      <p className="mt-1 text-sm text-slate-500">{t("notifications.prefs.subtitle")}</p>

      <div className="mt-5 space-y-3">
        <PreferenceToggle title={t("notifications.prefs.email")} description={t("notifications.prefs.emailHint")} checked={prefs.emailEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("emailEnabled", checked)} />
        <PreferenceToggle title={t("notifications.prefs.push")} description={t("notifications.prefs.pushHint")} checked={prefs.pushEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("pushEnabled", checked)} />
        <PreferenceToggle title={t("notifications.prefs.digest")} description={t("notifications.prefs.digestHint")} checked={prefs.digestEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("digestEnabled", checked)} />
        <PreferenceToggle title={t("notifications.prefs.sms")} description={t("notifications.prefs.smsHint")} checked={prefs.smsEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("smsEnabled", checked)} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <PreferenceToggle title="Task baru" description="Notif saat task baru diberikan ke outlet atau area manager." checked={prefs.taskIncomingEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("taskIncomingEnabled", checked)} />
        <PreferenceToggle title="Task akan publish" description="Notif upcoming task dari auto publish schedule." checked={prefs.taskUpcomingEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("taskUpcomingEnabled", checked)} />
        <PreferenceToggle title="Task overdue" description="Notif saat task melewati batas waktu." checked={prefs.taskOverdueEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("taskOverdueEnabled", checked)} />
        <PreferenceToggle title="Task selesai" description="Notif ke supervisor saat outlet menyelesaikan task." checked={prefs.taskCompletedEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("taskCompletedEnabled", checked)} />
        <PreferenceToggle title="Checklist gagal" description="Notif saat checklist gagal dan perlu perhatian manager." checked={prefs.checklistFailedEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("checklistFailedEnabled", checked)} />
        <PreferenceToggle title="Quiet hours" description="Tahan push/email/SMS selama jam tenang. In-app tetap tersimpan." checked={prefs.quietHoursEnabled} disabled={saveMutation.isPending || prefsQuery.isLoading} onChange={(checked) => update("quietHoursEnabled", checked)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Quiet start
          <input
            type="time"
            value={prefs.quietHoursStart}
            onChange={(event) => update("quietHoursStart", event.target.value)}
            disabled={saveMutation.isPending || prefsQuery.isLoading}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Quiet end
          <input
            type="time"
            value={prefs.quietHoursEnd}
            onChange={(event) => update("quietHoursEnd", event.target.value)}
            disabled={saveMutation.isPending || prefsQuery.isLoading}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
          />
        </label>
      </div>

      {saved ? (
        <p className="mt-3 text-xs font-semibold text-emerald-700">{t("notifications.prefs.saved")}</p>
      ) : null}
    </section>
  );
}
