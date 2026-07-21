"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useState } from "react";

import { apiKeyService, type ApiKeyCreated } from "@/services/api-key.service";
import { EnterpriseField, EnterpriseInput } from "@/shared/form";
import { useLanguage } from "@/shared/i18n";
import { SectionCard } from "@/shared/ui/cards/section-card";

const SCOPE_OPTIONS = [
  { value: "read:health", labelKey: "apiKeys.scopes.health" },
  { value: "read:form-templates", labelKey: "apiKeys.scopes.formTemplates" },
  { value: "read:reports", labelKey: "apiKeys.scopes.reports" },
] as const;

export function ApiKeysPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read:health", "read:form-templates"]);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["api-keys"],
    queryFn: apiKeyService.list,
  });

  const createMutation = useMutation({
    mutationFn: apiKeyService.create,
    onSuccess: (result) => {
      setCreatedKey(result);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: apiKeyService.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]
    );
  }

  async function copyRawKey() {
    if (!createdKey?.raw_key) return;

    await navigator.clipboard.writeText(createdKey.raw_key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SectionCard title={t("apiKeys.title")}>
      <p className="mb-4 text-sm text-slate-500">{t("apiKeys.description")}</p>

      {createdKey ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{t("apiKeys.createdTitle")}</p>
          <p className="mt-1 text-xs text-amber-800">{t("apiKeys.createdHint")}</p>
          <code className="mt-3 block overflow-x-auto rounded-xl bg-white px-3 py-2 text-xs text-slate-800">
            {createdKey.raw_key}
          </code>
          <button
            type="button"
            onClick={() => void copyRawKey()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#274733] px-4 py-2 text-xs font-semibold text-white"
          >
            <Copy className="size-3.5" />
            {copied ? t("apiKeys.copied") : t("apiKeys.copy")}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <EnterpriseField label={t("apiKeys.create")}>
          <EnterpriseInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("apiKeys.namePlaceholder")}
          />
        </EnterpriseField>
        <button
          type="button"
          disabled={!name.trim() || scopes.length === 0 || createMutation.isPending}
          onClick={() =>
            createMutation.mutate({
              name: name.trim(),
              scopes,
            })
          }
          className="rounded-xl bg-[#274733] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {t("apiKeys.create")}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SCOPE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <input
              type="checkbox"
              checked={scopes.includes(option.value)}
              onChange={() => toggleScope(option.value)}
              className="accent-[#3D6B49]"
            />
            {t(option.labelKey)}
          </label>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {(query.data ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            {t("apiKeys.empty")}
          </p>
        ) : (
          (query.data ?? []).map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  <KeyRound className="size-4 text-emerald-700" />
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.key_prefix}… · {item.scopes.join(", ")}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.last_used_at
                    ? `${t("apiKeys.lastUsed")}: ${new Date(item.last_used_at).toLocaleString()}`
                    : t("apiKeys.neverUsed")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(item.id)}
                disabled={revokeMutation.isPending}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
                {t("apiKeys.revoke")}
              </button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
