"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  createTrainingModule,
  deleteTrainingModule,
  listTrainingModules,
} from "@/services/lms.service";
import { EnterpriseField, EnterpriseInput } from "@/shared/form";
import { useLanguage } from "@/shared/i18n";

export default function TrainingManagePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [roles, setRoles] = useState("outlet,area_manager");

  const modulesQuery = useQuery({
    queryKey: ["training-modules"],
    queryFn: listTrainingModules,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createTrainingModule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
      setTitle("");
      setDescription("");
      setContentUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTrainingModule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training-modules"] }),
  });

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("training.manageEyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("training.manageTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("training.manageSubtitle")}</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          createMutation.mutate({
            title: title.trim(),
            description: description.trim() || undefined,
            content_url: contentUrl.trim() || undefined,
            required_for_roles: roles.split(",").map((role) => role.trim()).filter(Boolean),
            duration_minutes: 20,
            expires_days: 365,
          });
        }}
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-950">{t("training.createModule")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EnterpriseField label={t("training.fieldTitle")}>
            <EnterpriseInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </EnterpriseField>
          <EnterpriseField label={t("training.fieldRoles")}>
            <EnterpriseInput value={roles} onChange={(e) => setRoles(e.target.value)} />
          </EnterpriseField>
          <EnterpriseField label={t("training.fieldDescription")}>
            <EnterpriseInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </EnterpriseField>
          <EnterpriseField label={t("training.fieldContentUrl")}>
            <EnterpriseInput value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
          </EnterpriseField>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || !title.trim()}
          className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {t("training.createAction")}
        </button>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">{t("training.modulesList")}</h2>
        <div className="mt-4 space-y-3">
          {(modulesQuery.data ?? []).map((module) => (
            <div key={module.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-950">{module.title}</p>
                <p className="text-xs text-slate-500">
                  {(module.required_for_roles ?? []).join(", ") || t("training.allRoles")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(module.id)}
                className="text-sm font-semibold text-red-700"
              >
                {t("training.delete")}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
