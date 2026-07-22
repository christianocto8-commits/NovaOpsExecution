"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchIntegrationsStatus } from "@/services/integrations.service";
import { useLanguage } from "@/shared/i18n";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ok ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function IntegrationsStatusPanel() {
  const { t } = useLanguage();

  const statusQuery = useQuery({
    queryKey: ["integrations-status"],
    queryFn: fetchIntegrationsStatus,
    retry: false,
  });

  const status = statusQuery.data;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-950">{t("integrations.title")}</h3>
      <p className="mt-1 text-sm text-slate-500">{t("integrations.subtitle")}</p>

      <div className="mt-5 space-y-3">
        {statusQuery.isLoading ? (
          <p className="text-sm text-slate-500">{t("integrations.loading")}</p>
        ) : status ? (
          <>
            <Row
              label="Google OAuth"
              pill={
                <StatusPill
                  ok={status.google_oauth.configured}
                  label={
                    status.google_oauth.configured
                      ? t("integrations.configured")
                      : t("integrations.notConfigured")
                  }
                />
              }
            />
            <Row
              label="OIDC SSO"
              pill={
                <StatusPill
                  ok={status.oidc_sso.configured}
                  label={
                    status.oidc_sso.configured
                      ? t("integrations.configured")
                      : t("integrations.notConfigured")
                  }
                />
              }
            />
            <Row
              label="SAML SSO"
              pill={
                <StatusPill
                  ok={status.saml_sso.configured}
                  label={
                    status.saml_sso.configured
                      ? t("integrations.configured")
                      : t("integrations.notConfigured")
                  }
                />
              }
            />
            <Row
              label="SMS (Twilio)"
              pill={
                <StatusPill
                  ok={status.sms_twilio.configured && status.sms_twilio.enabled}
                  label={
                    status.sms_twilio.enabled
                      ? t("integrations.enabled")
                      : t("integrations.disabled")
                  }
                />
              }
            />
            <Row
              label="Web Push (VAPID)"
              pill={
                <StatusPill
                  ok={status.web_push_vapid.configured}
                  label={
                    status.web_push_vapid.configured
                      ? t("integrations.configured")
                      : t("integrations.notConfigured")
                  }
                />
              }
            />
            <Row
              label="Webhooks"
              pill={
                <StatusPill
                  ok={status.webhooks.enabled}
                  label={
                    status.webhooks.enabled
                      ? t("integrations.enabled")
                      : t("integrations.disabled")
                  }
                />
              }
            />
            <Row
              label="Video evidence"
              pill={
                <StatusPill ok={status.video_evidence.enabled} label={t("integrations.configured")} />
              }
            />
            <Row
              label="Native FCM"
              pill={
                <StatusPill
                  ok={status.native_push.fcm_configured}
                  label={
                    status.native_push.fcm_configured
                      ? t("integrations.configured")
                      : t("integrations.notConfigured")
                  }
                />
              }
            />
          </>
        ) : (
          <p className="text-sm text-red-600">{t("integrations.notConfigured")}</p>
        )}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">{t("integrations.setupHint")}</p>
    </section>
  );
}

function Row({ label, pill }: { label: string; pill: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {pill}
    </div>
  );
}
