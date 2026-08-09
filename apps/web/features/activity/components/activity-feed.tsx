"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Megaphone,
  RefreshCw,
  Wrench,
} from "lucide-react";

import { queryKeys } from "@/lib/query/keys";
import {
  activityService,
  type ActivityAction,
  type ActivityFeedItem,
} from "@/services/activity.service";
import { useLanguage } from "@/shared/i18n";

const actionIcons: Record<ActivityAction, { icon: typeof ClipboardCheck; tone: string }> = {
  task_completed: { icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
  checklist_submitted: { icon: ClipboardCheck, tone: "bg-blue-100 text-blue-700" },
  checklist_failed: { icon: AlertTriangle, tone: "bg-rose-100 text-rose-700" },
  capa_created: { icon: Wrench, tone: "bg-amber-100 text-amber-700" },
  capa_resolved: { icon: Wrench, tone: "bg-emerald-100 text-emerald-700" },
  form_submitted: { icon: FileText, tone: "bg-indigo-100 text-indigo-700" },
  announcement_published: { icon: Megaphone, tone: "bg-purple-100 text-purple-700" },
  task_overdue: { icon: AlertTriangle, tone: "bg-red-100 text-red-700" },
};

function formatTimestamp(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type ActivityFeedProps = {
  outletId?: number;
  days?: number;
  limit?: number;
  compact?: boolean;
  title?: string;
};

function ActivityFeedRow({
  item,
  compact,
  locale,
}: {
  item: ActivityFeedItem;
  compact?: boolean;
  locale: string;
}) {
  const config = actionIcons[item.action] ?? actionIcons.task_completed;
  const Icon = config.icon;
  const content = (
    <div className="flex gap-3 py-3">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${config.tone}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className={`font-semibold text-slate-900 ${compact ? "text-sm" : ""}`}>
            {item.summary}
          </p>
          <span className="shrink-0 text-xs text-slate-500">
            {formatTimestamp(item.occurred_at, locale)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {item.actor_name}
          {item.outlet_name ? ` · ${item.outlet_name}` : ""}
        </p>
      </div>
    </div>
  );

  if (item.detail_url) {
    return (
      <Link href={item.detail_url} className="block transition hover:bg-slate-50">
        {content}
      </Link>
    );
  }

  return content;
}

export function ActivityFeed({
  outletId,
  days = 30,
  limit = 20,
  compact = false,
  title,
}: ActivityFeedProps) {
  const { t, language } = useLanguage();
  const resolvedTitle = title ?? t("activity.title");

  const query = useQuery({
    queryKey: queryKeys.activity.feed({ outletId, days, limit }),
    queryFn: () => activityService.getFeed({ outletId, days, limit }),
    refetchInterval: 30_000,
  });

  const items = query.data?.items ?? [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#274733]">{resolvedTitle}</h2>
          {!compact ? (
            <p className="mt-1 text-xs text-slate-500">{t("activity.subtitle")}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="inline-flex items-center gap-1 rounded-full border border-[#DDE8E1] px-3 py-1.5 text-xs font-semibold text-[#3D6B49]"
        >
          <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          {t("activity.refresh")}
        </button>
      </div>

      {query.isLoading ? (
        <p className="py-6 text-center text-sm text-slate-500">{t("activity.loading")}</p>
      ) : query.isError ? (
        <p className="py-6 text-center text-sm text-rose-600">{t("activity.error")}</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t("activity.empty")}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <ActivityFeedRow key={item.id} item={item} compact={compact} locale={language} />
          ))}
        </div>
      )}

      {!compact && items.length > 0 ? (
        <div className="mt-3 text-center">
          <Link
            href="/dashboard/activity"
            className="text-xs font-semibold text-[#3D6B49] hover:underline"
          >
            {t("activity.viewAll")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
