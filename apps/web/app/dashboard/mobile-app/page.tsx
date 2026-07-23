"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Copy, Smartphone } from "lucide-react";

import { fetchIntegrationsStatus } from "@/services/integrations.service";
import { buildApiUrl } from "@/lib/api-url";
import { useLanguage } from "@/shared/i18n";

const DEEP_LINKS = [
  { label: "Operator home", path: "/dashboard/operator" },
  { label: "Tasks", path: "/dashboard/tasks" },
];

export default function MobileAppPage() {
  const { t } = useLanguage();
  const statusQuery = useQuery({
    queryKey: ["integrations-status"],
    queryFn: fetchIntegrationsStatus,
    retry: false,
  });

  const nativePush = statusQuery.data?.native_push;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.novaops.local";
  const pwaUrl = `${origin}/dashboard/operator`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pwaUrl)}`;

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("mobileApp.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("mobileApp.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("mobileApp.subtitle")}</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-emerald-700" />
            <h2 className="text-lg font-semibold text-slate-950">{t("mobileApp.androidTitle")}</h2>
          </div>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>{t("mobileApp.androidStep1")}</li>
            <li>{t("mobileApp.androidStep2")}</li>
            <li>{t("mobileApp.androidStep3")}</li>
          </ol>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{t("mobileApp.iosTitle")}</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
            <li>{t("mobileApp.iosStep1")}</li>
            <li>{t("mobileApp.iosStep2")}</li>
            <li>{t("mobileApp.iosStep3")}</li>
          </ol>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{t("mobileApp.fcmTitle")}</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              FCM client:{" "}
              <span className="font-semibold text-slate-900">
                {nativePush?.fcm_configured ? "configured" : "missing google-services.json"}
              </span>
            </p>
            <p>
              FCM send:{" "}
              <span className="font-semibold text-slate-900">
                {nativePush?.fcm_send_ready ? "ready" : "pending server credentials"}
              </span>
            </p>
            <p>
              Live ready:{" "}
              <span className="font-semibold text-emerald-700">
                {nativePush?.live_ready ? "yes" : "no"}
              </span>
            </p>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">{t("mobileApp.deepLinksTitle")}</h2>
          <ul className="mt-4 space-y-3">
            {DEEP_LINKS.map((link) => {
              const href = `${origin}${link.path}`;
              return (
                <li key={link.path} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{link.label}</span>
                  <button
                    type="button"
                    onClick={() => void copyText(href)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Capacitor universal links: register {origin} in Android intent filters and iOS associated domains.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">{t("mobileApp.pwaTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("mobileApp.pwaHint")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="PWA install QR" className="rounded-xl border border-slate-200" width={180} height={180} />
          <div className="space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{pwaUrl}</p>
            <Link href="/dashboard/operator" className="font-bold text-emerald-700 hover:text-emerald-800">
              Open operator landing
            </Link>
            <p className="text-xs text-slate-500">
              SAML SP metadata:{" "}
              <a
                href={buildApiUrl("/api/v1/auth/saml/metadata")}
                className="font-semibold text-emerald-700"
                target="_blank"
                rel="noreferrer"
              >
                /api/v1/auth/saml/metadata
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
