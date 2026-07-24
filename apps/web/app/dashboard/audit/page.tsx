"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileText, MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";

import { useOutletsWorkspace } from "@/features/outlets/hooks/use-outlets-workspace";
import { queryKeys } from "@/lib/query/keys";
import { auditService, type AuditEvent, type AuditEventCategory } from "@/services/audit.service";
import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";

const categoryLabels: Record<AuditEventCategory, string> = {
  task_comment: "Komentar Task",
  form_submission: "Submit Form",
  execution_session: "Checklist",
  security: "Security",
};

const categoryIcons: Record<AuditEventCategory, typeof MessageSquare> = {
  task_comment: MessageSquare,
  form_submission: FileText,
  execution_session: ClipboardList,
  security: ShieldCheck,
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const columns: EnterpriseColumn<AuditEvent>[] = [
  {
    key: "occurred_at",
    header: "Waktu",
    sortable: true,
    render: (row) => formatTimestamp(row.occurred_at),
  },
  {
    key: "category",
    header: "Tipe",
    sortable: true,
    render: (row) => categoryLabels[row.category] ?? row.category,
  },
  {
    key: "summary",
    header: "Ringkasan",
    render: (row) => (
      <div>
        <p className="font-semibold text-slate-900">{row.summary}</p>
        <p className="mt-1 text-xs text-slate-500">{row.action}</p>
      </div>
    ),
  },
  {
    key: "actor_name",
    header: "Pelaku",
    sortable: true,
  },
  {
    key: "outlet_name",
    header: "Outlet",
    sortable: true,
    render: (row) => row.outlet_name ?? "-",
  },
];

export default function AuditCenterPage() {
  const { outlets } = useOutletsWorkspace();
  const [outletFilter, setOutletFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditEventCategory | "">("");
  const [daysFilter, setDaysFilter] = useState("30");

  const query = useQuery({
    queryKey: queryKeys.audit.events({
      outletName: outletFilter || undefined,
      actor: actorFilter || undefined,
      category: categoryFilter || undefined,
      days: daysFilter,
    }),
    queryFn: () =>
      auditService.listEvents({
        outletName: outletFilter || undefined,
        actor: actorFilter || undefined,
        category: categoryFilter || undefined,
        days: Number(daysFilter) || 30,
        limit: 100,
      }),
  });

  const items = query.data?.items ?? [];
  const categoryCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((counts, item) => {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
      return counts;
    }, {});
  }, [items]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Audit Trail</p>
          <h1 className="text-2xl font-semibold text-slate-950">Pusat Audit Operasional</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Riwayat read-only dari komentar task, submit form manual, checklist execution session,
            dan event keamanan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="size-4" />
          Muat ulang
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Event</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{query.data?.total ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Komentar Task</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {categoryCounts.task_comment ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submit Form</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {categoryCounts.form_submission ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {categoryCounts.execution_session ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Security</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {categoryCounts.security ?? 0}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-950">Filter Audit</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            value={outletFilter}
            onChange={(event) => setOutletFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Semua outlet</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.name}>
                {outlet.name}
              </option>
            ))}
          </select>

          <input
            value={actorFilter}
            onChange={(event) => setActorFilter(event.target.value)}
            placeholder="Filter pelaku..."
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-600"
          />

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value as AuditEventCategory | "")
            }
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Semua tipe event</option>
            <option value="task_comment">Komentar Task</option>
            <option value="form_submission">Submit Form</option>
            <option value="execution_session">Checklist</option>
            <option value="security">Security</option>
          </select>

          <select
            value={daysFilter}
            onChange={(event) => setDaysFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-600"
          >
            <option value="7">7 hari terakhir</option>
            <option value="30">30 hari terakhir</option>
            <option value="90">90 hari terakhir</option>
          </select>
        </div>
      </section>

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {query.error instanceof Error ? query.error.message : "Gagal memuat audit trail."}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <p className="text-sm font-bold text-slate-950">Timeline Audit</p>
          <p className="mt-1 text-sm text-slate-500">
            Event terbaru dari backend — read only untuk manager/admin.
          </p>
        </div>

        {query.isLoading ? (
          <div className="p-8 text-sm text-slate-500">Memuat audit trail...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada event audit untuk filter ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const Icon = categoryIcons[item.category] ?? MessageSquare;

              return (
                <div key={item.id} className="flex gap-4 p-5">
                  <div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-semibold text-slate-950">{item.summary}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {categoryLabels[item.category]} • {item.actor_name}
                          {item.outlet_name ? ` • ${item.outlet_name}` : ""}
                        </p>
                      </div>
                      <time className="text-xs font-semibold text-slate-400">
                        {formatTimestamp(item.occurred_at)}
                      </time>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {item.resource_type} #{item.resource_id} • {item.action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <EnterpriseDataTable
        title="Daftar Audit Event"
        description="Tabel ringkas untuk export dan review manager."
        data={items}
        columns={columns}
        searchPlaceholder="Cari ringkasan atau pelaku..."
        exportable
        exportFileName="audit-trail"
        exportSheetName="Audit Trail"
      />
    </main>
  );
}
