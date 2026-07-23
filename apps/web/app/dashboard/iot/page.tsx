"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Radio, Thermometer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { listIotReadings } from "@/services/iot.service";
import { buildApiUrl } from "@/lib/api-url";
import { useLanguage } from "@/shared/i18n";

function buildLast24hChart(readings: Awaited<ReturnType<typeof listIotReadings>>) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const buckets = new Map<string, number>();

  for (const reading of readings) {
    const ts = new Date(reading.recorded_at).getTime();
    if (ts < dayAgo) continue;
    const hour = new Date(reading.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    buckets.set(hour, reading.value);
  }

  return Array.from(buckets.entries()).map(([hour, value]) => ({ hour, value }));
}

export default function IotDashboardPage() {
  const { t } = useLanguage();
  const readingsQuery = useQuery({
    queryKey: ["iot-readings"],
    queryFn: () => listIotReadings({ limit: 200 }),
    retry: false,
  });

  const readings = readingsQuery.data ?? [];
  const chartData = buildLast24hChart(readings);
  const ingestUrl = buildApiUrl("/api/v1/iot/ingest");

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("iot.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("iot.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("iot.subtitle")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Thermometer className="size-4" />
            <p className="text-sm">{t("iot.readingsCount")}</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{readings.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-sm font-semibold text-slate-800">{t("iot.ingestUrl")}</p>
          <code className="mt-2 block overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            POST {ingestUrl}
          </code>
          <p className="mt-2 text-xs text-slate-500">{t("iot.ingestHint")}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">{t("iot.chartTitle")}</h2>
        <div className="mt-4 h-64">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#047857" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">{t("iot.noChartData")}</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{t("iot.tableTitle")}</h2>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700"
          >
            {t("iot.openSettings")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">{t("iot.colType")}</th>
                <th className="px-3 py-2">{t("iot.colValue")}</th>
                <th className="px-3 py-2">{t("iot.colOutlet")}</th>
                <th className="px-3 py-2">{t("iot.colRecorded")}</th>
              </tr>
            </thead>
            <tbody>
              {readingsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-slate-500">
                    {t("iot.loading")}
                  </td>
                </tr>
              ) : readings.length ? (
                readings.slice(0, 50).map((reading) => (
                  <tr key={reading.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-900">{reading.sensor_type}</td>
                    <td className="px-3 py-3">
                      {reading.value}
                      {reading.unit ? ` ${reading.unit}` : ""}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{reading.outlet_id.slice(0, 8)}…</td>
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(reading.recorded_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-slate-500">
                    {t("iot.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-700">
        <div className="flex items-start gap-2">
          <Radio className="mt-0.5 size-4 text-emerald-700" />
          <p>{t("iot.evaluateHint")}</p>
        </div>
      </section>
    </main>
  );
}
