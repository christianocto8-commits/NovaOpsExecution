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
  const [question, setQuestion] = useState("");
  const [choices, setChoices] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<
    Array<{ id: string; prompt: string; choices: string[]; correct_answer: string }>
  >([]);

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
      setQuizQuestions([]);
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
            quiz_questions: quizQuestions,
            passing_score: 80,
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
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-900">Assessment (opsional)</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <EnterpriseField label="Pertanyaan">
              <EnterpriseInput value={question} onChange={(e) => setQuestion(e.target.value)} />
            </EnterpriseField>
            <EnterpriseField label="Pilihan (pisahkan koma)">
              <EnterpriseInput value={choices} onChange={(e) => setChoices(e.target.value)} />
            </EnterpriseField>
            <EnterpriseField label="Jawaban benar">
              <EnterpriseInput
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
            </EnterpriseField>
          </div>
          <button
            type="button"
            onClick={() => {
              const parsedChoices = choices
                .split(",")
                .map((choice) => choice.trim())
                .filter(Boolean);
              if (!question.trim() || parsedChoices.length < 2 || !correctAnswer.trim()) return;
              setQuizQuestions((current) => [
                ...current,
                {
                  id: `q-${Date.now()}`,
                  prompt: question.trim(),
                  choices: parsedChoices,
                  correct_answer: correctAnswer.trim(),
                },
              ]);
              setQuestion("");
              setChoices("");
              setCorrectAnswer("");
            }}
            className="mt-3 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-700"
          >
            Tambah pertanyaan
          </button>
          {quizQuestions.length ? (
            <p className="mt-2 text-xs text-slate-500">
              {quizQuestions.length} pertanyaan, nilai lulus 80%.
            </p>
          ) : null}
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
