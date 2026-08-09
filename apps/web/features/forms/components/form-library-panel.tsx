"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";

import {
  getFormCategoryLabel,
  ZENPUT_FORM_CATEGORIES,
} from "@/features/forms/constants/form-categories";
import { useActiveFormTemplates } from "@/features/forms/hooks/use-form-templates";
import type { FormTemplate } from "@/features/forms/types";
import { useLanguage } from "@/shared/i18n";

const RECENT_TEMPLATES_KEY = "novaops-recent-form-templates";

function readRecentTemplateIds() {
  if (typeof window === "undefined") return [] as string[];

  try {
    const raw = window.localStorage.getItem(RECENT_TEMPLATES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function rememberRecentTemplate(templateId: string) {
  if (typeof window === "undefined") return;

  const current = readRecentTemplateIds().filter((id) => id !== templateId);
  window.localStorage.setItem(
    RECENT_TEMPLATES_KEY,
    JSON.stringify([templateId, ...current].slice(0, 8))
  );
}

type FormLibraryPanelProps = {
  compact?: boolean;
  onSelectTemplate?: (template: FormTemplate) => void;
  selectedTemplateId?: string;
};

export function FormLibraryPanel({
  compact = false,
  onSelectTemplate,
  selectedTemplateId,
}: FormLibraryPanelProps) {
  const { t } = useLanguage();
  const { activeTemplates, isLoading } = useActiveFormTemplates();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const recentTemplateIds = useMemo(() => readRecentTemplateIds(), [activeTemplates.length]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("all", activeTemplates.length);

    activeTemplates.forEach((template) => {
      counts.set(template.category, (counts.get(template.category) ?? 0) + 1);
    });

    return counts;
  }, [activeTemplates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activeTemplates.filter((template) => {
      if (categoryFilter !== "all" && template.category !== categoryFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [template.name, getFormCategoryLabel(template.category), template.description]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeTemplates, categoryFilter, query]);

  const recentTemplates = useMemo(() => {
    return recentTemplateIds
      .map((id) => activeTemplates.find((template) => template.id === id))
      .filter((template): template is FormTemplate => Boolean(template));
  }, [activeTemplates, recentTemplateIds]);

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        {t("forms.library.loading")}
      </section>
    );
  }

  if (activeTemplates.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            {t("forms.library.eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{t("forms.library.title")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("forms.library.subtitle")}</p>
        </div>
        {!compact ? (
          <Link
            href="/dashboard/forms"
            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {t("forms.library.openPage")}
          </Link>
        ) : null}
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? "" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`}>
        {!compact ? (
          <div className="space-y-1">
            <p className="px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Categories
            </p>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                categoryFilter === "all"
                  ? "bg-emerald-50 font-semibold text-emerald-800"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{t("forms.library.allCategories")}</span>
              <span className="text-xs">{categoryCounts.get("all") ?? 0}</span>
            </button>
            {ZENPUT_FORM_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                  categoryFilter === category.id
                    ? "bg-emerald-50 font-semibold text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{category.label}</span>
                <span className="text-xs">{categoryCounts.get(category.id) ?? 0}</span>
              </button>
            ))}
          </div>
        ) : (
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
          >
            <option value="all">{t("forms.library.allCategories")}</option>
            {ZENPUT_FORM_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        )}

        <div>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search className="size-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("forms.library.search")}
              className="w-full border-0 bg-transparent text-sm outline-none"
            />
          </label>

          {recentTemplates.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("forms.library.recentlyUsed")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentTemplates.map((template) => (
                  <button
                    key={`recent-${template.id}`}
                    type="button"
                    onClick={() => onSelectTemplate?.(template)}
                    className={`max-w-full truncate rounded-full px-3 py-1.5 text-xs font-semibold ${
                      selectedTemplateId === template.id
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectTemplate?.(template)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedTemplateId === template.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">{template.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{template.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {getFormCategoryLabel(template.category)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {t("forms.library.items", { count: template.fields.length })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {t("forms.library.noMatch")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
