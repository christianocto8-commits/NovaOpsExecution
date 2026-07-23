"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

import { completeTrainingModule, listMyTraining } from "@/services/lms.service";
import { useLanguage } from "@/shared/i18n";

export default function TrainingPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const trainingQuery = useQuery({
    queryKey: ["my-training"],
    queryFn: listMyTraining,
    retry: false,
  });

  const completeMutation = useMutation({
    mutationFn: completeTrainingModule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-training"] }),
  });

  const items = trainingQuery.data ?? [];
  const incomplete = items.filter((item) => item.required && !item.completed);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("training.eyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("training.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("training.subtitle")}</p>
        </div>
        <Link
          href="/dashboard/training/manage"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("training.manageLink")}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {incomplete.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("training.incompleteBanner", { count: String(incomplete.length) })}
        </div>
      ) : null}

      <section className="space-y-3">
        {trainingQuery.isLoading ? (
          <p className="text-sm text-slate-500">{t("training.loading")}</p>
        ) : items.length ? (
          items.map((item) => (
            <article
              key={item.module.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{item.module.title}</h2>
                    {item.completed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="size-3.5" />
                        {t("training.completed")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        {t("training.required")}
                      </span>
                    )}
                  </div>
                  {item.module.description ? (
                    <p className="mt-2 text-sm text-slate-600">{item.module.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {t("training.duration", { minutes: String(item.module.duration_minutes) })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.module.content_url ? (
                    <a
                      href={item.module.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {t("training.openContent")}
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null}
                  {!item.completed ? (
                    <button
                      type="button"
                      onClick={() => completeMutation.mutate(item.module.id)}
                      disabled={completeMutation.isPending}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {t("training.markComplete")}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">{t("training.empty")}</p>
        )}
      </section>
    </main>
  );
}
