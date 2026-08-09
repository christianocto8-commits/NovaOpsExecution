"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Settings2, Zap } from "lucide-react";

import { fetchIntegrationsStatus, testSmsIntegration } from "@/services/integrations.service";
import { buildApiUrl } from "@/lib/api-url";
import { listWebhooks, testWebhook } from "@/services/webhook.service";
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
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["integrations-status"],
    queryFn: fetchIntegrationsStatus,
    retry: false,
  });

  const webhooksQuery = useQuery({
    queryKey: ["webhooks"],
    queryFn: listWebhooks,
    retry: false,
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
  });

  const smsTestMutation = useMutation({
    mutationFn: () => testSmsIntegration(),
  });

  const status = statusQuery.data;
  const firstWebhook = webhooksQuery.data?.[0];

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
                  ok={Boolean(status.saml_sso.live_ready)}
                  label={
                    status.saml_sso.live_ready
                      ? t("integrations.samlLiveReady")
                      : t("integrations.samlPending")
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
                    status.webhooks.enabled ? t("integrations.enabled") : t("integrations.disabled")
                  }
                />
              }
            />
            <Row
              label="Video evidence"
              pill={
                <StatusPill
                  ok={status.video_evidence.enabled}
                  label={t("integrations.configured")}
                />
              }
            />
            <Row
              label="Native FCM"
              pill={
                <StatusPill
                  ok={Boolean(status.native_push.live_ready)}
                  label={
                    status.native_push.live_ready
                      ? t("integrations.nativePushReady")
                      : t("integrations.notConfigured")
                  }
                />
              }
            />
            <Row
              label="IoT sensors"
              pill={
                <StatusPill
                  ok={Boolean(status.iot_sensors?.enabled)}
                  label={t("integrations.iotEnabled")}
                />
              }
            />
            <Row
              label="LMS training"
              pill={
                <StatusPill
                  ok={Boolean(status.lms_training?.enabled)}
                  label={t("integrations.lmsEnabled")}
                />
              }
            />
          </>
        ) : (
          <p className="text-sm text-red-600">{t("integrations.notConfigured")}</p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/dashboard/webhooks"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          {t("integrations.manageWebhooks")}
          <ArrowRight className="size-4" />
        </Link>
        {firstWebhook ? (
          <button
            type="button"
            onClick={() => testMutation.mutate(firstWebhook.id)}
            disabled={testMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            <Zap className="size-4" />
            {testMutation.isPending
              ? t("integrations.testingWebhook")
              : t("integrations.testWebhook")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => smsTestMutation.mutate()}
          disabled={smsTestMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {smsTestMutation.isPending ? t("integrations.testingSms") : t("integrations.testSms")}
        </button>
        <a
          href={buildApiUrl("/api/v1/auth/saml/metadata")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="size-4" />
          {t("integrations.samlMetadata")}
        </a>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Settings2 className="size-4" />
          {t("integrations.openSettings")}
        </Link>
        <Link
          href="/dashboard/webhooks"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white"
        >
          <ExternalLink className="size-4" />
          {t("integrations.viewDeliveries")}
        </Link>
      </div>

      {testMutation.data ? (
        <p
          className={[
            "mt-3 text-xs font-semibold",
            testMutation.data.delivered ? "text-emerald-700" : "text-red-700",
          ].join(" ")}
        >
          {testMutation.data.delivered
            ? t("integrations.testWebhookSuccess")
            : t("integrations.testWebhookFailed", {
                error: testMutation.data.error_message ?? "unknown error",
              })}
        </p>
      ) : null}

      {smsTestMutation.data ? (
        <p className="mt-3 text-xs font-semibold text-emerald-700">
          {smsTestMutation.data.message}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">{t("integrations.setupHint")}</p>

      {status ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SetupChecklistCard
            title={t("integrations.ssoChecklistTitle")}
            steps={[...(status.oidc_sso.setup_steps ?? []), ...(status.saml_sso.setup_steps ?? [])]}
            configured={status.oidc_sso.configured || status.saml_sso.configured}
          />
          <SetupChecklistCard
            title={t("integrations.webhookChecklistTitle")}
            steps={
              status.webhooks.setup_steps?.length
                ? status.webhooks.setup_steps
                : [t("integrations.webhookChecklistReady")]
            }
            configured={status.webhooks.enabled}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <SetupWizardCard
          step={1}
          title={t("integrations.wizard.step1Title")}
          description={t("integrations.wizard.step1Body")}
          href="/dashboard/webhooks"
          actionLabel={t("integrations.wizard.step1Action")}
        />
        <SetupWizardCard
          step={2}
          title={t("integrations.wizard.step2Title")}
          description={t("integrations.wizard.step2Body")}
          href="/dashboard/webhooks"
          actionLabel={t("integrations.wizard.step2Action")}
        />
        <SetupWizardCard
          step={3}
          title={t("integrations.wizard.step3Title")}
          description={t("integrations.wizard.step3Body")}
          href="/dashboard/settings"
          actionLabel={t("integrations.wizard.step3Action")}
        />
      </div>
    </section>
  );
}

function SetupChecklistCard({
  title,
  steps,
  configured,
}: {
  title: string;
  steps: string[];
  configured: boolean;
}) {
  const uniqueSteps = Array.from(new Set(steps.filter(Boolean)));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-950">{title}</h4>
        <StatusPill ok={configured} label={configured ? "Ready" : "Pending"} />
      </div>
      <ul className="mt-3 space-y-2">
        {uniqueSteps.slice(0, 6).map((step) => (
          <li key={step} className="text-xs leading-5 text-slate-600">
            • {step}
          </li>
        ))}
      </ul>
    </article>
  );
}

function SetupWizardCard({
  step,
  title,
  description,
  href,
  actionLabel,
}: {
  step: number;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Step {step}</p>
      <h4 className="mt-2 text-sm font-bold text-slate-950">{title}</h4>
      <p className="mt-2 text-xs leading-5 text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
      >
        {actionLabel}
        <ExternalLink className="size-3.5" />
      </Link>
    </article>
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
