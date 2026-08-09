"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Server } from "lucide-react";

import { getHealthStatus } from "@/services/health.service";
import { jobsService } from "@/services/jobs.service";
import { listWebhookDeliveries } from "@/services/webhook.service";
import { useOfflineSync } from "@/providers/OfflineSyncProvider";

function statusClass(ok: boolean) {
  return ok
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";
}

export default function OpsHealthPage() {
  const [jobHistory, setJobHistory] = useState<Array<{ at: string; job: string; status: string }>>(
    []
  );
  const { isOnline, pendingSyncCount, failedSyncCount, isSyncing, syncNow } = useOfflineSync();
  const healthQuery = useQuery({
    queryKey: ["ops-health", "api"],
    queryFn: getHealthStatus,
    retry: false,
  });
  const deliveriesQuery = useQuery({
    queryKey: ["ops-health", "webhook-deliveries"],
    queryFn: () => listWebhookDeliveries({ limit: 50 }),
    retry: false,
  });
  const jobRunsQuery = useQuery({
    queryKey: ["ops-health", "scheduler-job-runs"],
    queryFn: () => jobsService.listRuns(20),
    retry: false,
  });

  const failedDeliveries = (deliveriesQuery.data ?? []).filter(
    (delivery) => delivery.status === "failed"
  );
  const apiOk = healthQuery.data?.status === "ok";

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Operations</p>
        <h1 className="text-2xl font-semibold text-slate-950">Ops Health</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Ringkasan kondisi API, offline sync, dan integrasi webhook untuk monitoring VPS
          production.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-2xl border p-5 ${statusClass(apiOk)}`}>
          <Server className="h-5 w-5" />
          <p className="mt-3 text-sm font-semibold">API health</p>
          <p className="mt-1 text-2xl font-bold">
            {healthQuery.isLoading ? "Checking" : apiOk ? "OK" : "Issue"}
          </p>
          <p className="mt-1 text-xs opacity-80">
            {healthQuery.data
              ? `${healthQuery.data.service} ${healthQuery.data.version}`
              : healthQuery.error instanceof Error
                ? healthQuery.error.message
                : "No response yet"}
          </p>
        </div>

        <div className={`rounded-2xl border p-5 ${statusClass(isOnline)}`}>
          <CloudOff className="h-5 w-5" />
          <p className="mt-3 text-sm font-semibold">Browser connection</p>
          <p className="mt-1 text-2xl font-bold">{isOnline ? "Online" : "Offline"}</p>
          <p className="mt-1 text-xs opacity-80">Status koneksi perangkat saat ini.</p>
        </div>

        <div className={`rounded-2xl border p-5 ${statusClass(failedSyncCount === 0)}`}>
          <RefreshCw className={isSyncing ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
          <p className="mt-3 text-sm font-semibold">Offline sync</p>
          <p className="mt-1 text-2xl font-bold">{pendingSyncCount} pending</p>
          <p className="mt-1 text-xs opacity-80">{failedSyncCount} failed mutation.</p>
        </div>

        <div className={`rounded-2xl border p-5 ${statusClass(failedDeliveries.length === 0)}`}>
          {failedDeliveries.length === 0 ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <p className="mt-3 text-sm font-semibold">Webhook delivery</p>
          <p className="mt-1 text-2xl font-bold">{failedDeliveries.length} failed</p>
          <p className="mt-1 text-xs opacity-80">Dari 50 delivery terakhir.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-950">Background job coverage</p>
        <p className="mt-1 text-sm text-slate-500">
          Job scheduler production harus menjalankan pipeline ini lewat endpoint server-side yang
          dilindungi scheduler secret.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Task schedule publish",
            "Overdue alerts/report",
            "Due soon alerts",
            "Compliance digest",
          ].map((job) => (
            <div key={job} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">{job}</p>
              <p className="mt-1 text-xs text-slate-500">Included in scheduler process pipeline.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-950">Scheduler job history</p>
            <p className="mt-1 text-sm text-slate-500">
              Riwayat persisten dari pipeline scheduler production.
            </p>
          </div>
          <button
            type="button"
            onClick={() => jobRunsQuery.refetch()}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {(jobRunsQuery.data ?? []).length ? (
            (jobRunsQuery.data ?? []).slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-950">{run.job_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(run.started_at).toLocaleString("id-ID")} - {run.duration_ms}ms
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    run.status === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {run.status}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Belum ada riwayat scheduler job dari server.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void syncNow().then(() => {
                setJobHistory((current) =>
                  [
                    {
                      at: new Date().toLocaleString("id-ID"),
                      job: "Manual offline sync",
                      status: "completed",
                    },
                    ...current,
                  ].slice(0, 6)
                );
              });
            }}
            disabled={!isOnline || isSyncing}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {isSyncing ? "Syncing..." : "Sync offline queue"}
          </button>
          <Link
            href="/dashboard/webhooks"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Open webhook monitor
          </Link>
          <Link
            href="/dashboard/audit"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
          >
            Open audit trail
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-bold text-slate-950">Local admin run history</p>
          {jobHistory.length ? (
            jobHistory.map((item) => (
              <div
                key={`${item.at}-${item.job}`}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-slate-950">{item.job}</span>
                <span className="ml-2 text-slate-500">
                  {item.status} at {item.at}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Belum ada manual admin run di sesi browser ini.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
