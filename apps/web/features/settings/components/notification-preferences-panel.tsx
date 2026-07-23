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
};

const defaults: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  digestEnabled: false,
  smsEnabled: false,
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
  };
}

function fromApiPayload(payload: {
  email_enabled: boolean;
  push_enabled: boolean;
  digest_enabled: boolean;
  sms_enabled?: boolean;
}): NotificationPreferences {
  return {
    emailEnabled: payload.email_enabled,
    pushEnabled: payload.push_enabled,
    digestEnabled: payload.digest_enabled,
    smsEnabled: payload.sms_enabled ?? false,
  };
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
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("notifications.prefs.email")}</p>
            <p className="text-xs text-slate-500">{t("notifications.prefs.emailHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.emailEnabled}
            onChange={(event) => update("emailEnabled", event.target.checked)}
            disabled={saveMutation.isPending || prefsQuery.isLoading}
            className="size-5 accent-emerald-700"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("notifications.prefs.push")}</p>
            <p className="text-xs text-slate-500">{t("notifications.prefs.pushHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.pushEnabled}
            onChange={(event) => update("pushEnabled", event.target.checked)}
            disabled={saveMutation.isPending || prefsQuery.isLoading}
            className="size-5 accent-emerald-700"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("notifications.prefs.digest")}</p>
            <p className="text-xs text-slate-500">{t("notifications.prefs.digestHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.digestEnabled}
            onChange={(event) => update("digestEnabled", event.target.checked)}
            disabled={saveMutation.isPending || prefsQuery.isLoading}
            className="size-5 accent-emerald-700"
          />
        </label>

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("notifications.prefs.sms")}</p>
            <p className="text-xs text-slate-500">{t("notifications.prefs.smsHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={prefs.smsEnabled}
            onChange={(event) => update("smsEnabled", event.target.checked)}
            disabled={saveMutation.isPending || prefsQuery.isLoading}
            className="size-5 accent-emerald-700"
          />
        </label>
      </div>

      {saved ? (
        <p className="mt-3 text-xs font-semibold text-emerald-700">{t("notifications.prefs.saved")}</p>
      ) : null}
    </section>
  );
}
