"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createTaskDraft,
  deleteTaskDraft,
  getTaskDrafts,
  publishTaskDraft,
  type TaskDraft,
} from "@/services/draft.service";
import {
  EnterpriseField,
  EnterpriseInput,
  EnterpriseSelect,
  EnterpriseTextarea,
} from "@/shared/form";

const priorities = ["low", "medium", "high", "critical"] as const;

const draftSchema = z.object({
  title: z.string().trim().min(1, "Draft title is required"),
  description: z.string().optional(),
  priority: z.enum(priorities),
});

type DraftFormValues = z.infer<typeof draftSchema>;

type DraftResourceState = {
  drafts: TaskDraft[];
  isLoading: boolean;
  error: string | null;
};

export function DraftCenter() {
  const [resource, setResource] = useState<DraftResourceState>({
    drafts: [],
    isLoading: false,
    error: null,
  });

  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DraftFormValues>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
    },
  });

  const activeDrafts = useMemo(
    () => resource.drafts.filter((draft) => draft.status === "draft"),
    [resource.drafts]
  );

  async function loadDrafts() {
    setResource((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      const data = await getTaskDrafts();

      setResource({
        drafts: data,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setResource((current) => ({
        ...current,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load drafts",
      }));
    }
  }

  async function handleCreateDraft(values: DraftFormValues) {
    try {
      setIsSaving(true);

      setResource((current) => ({
        ...current,
        error: null,
      }));

      await createTaskDraft({
        title: values.title,
        description: values.description ?? "",
        priority: values.priority,
      });

      reset();
      await loadDrafts();
    } catch (err) {
      setResource((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "Failed to create draft",
      }));
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(draftId: number) {
    try {
      setResource((current) => ({
        ...current,
        error: null,
      }));

      await publishTaskDraft(draftId);
      await loadDrafts();
    } catch (err) {
      setResource((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "Failed to publish draft",
      }));
    }
  }

  async function handleDelete(draftId: number) {
    try {
      setResource((current) => ({
        ...current,
        error: null,
      }));

      await deleteTaskDraft(draftId);
      await loadDrafts();
    } catch (err) {
      setResource((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "Failed to delete draft",
      }));
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3D6B49]">
          Sprint 06B
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#274733]">Draft Center</h1>
        <p className="mt-3 max-w-2xl text-sm text-[#66756B]">
          Prepare task drafts before publishing them into live operational task execution.
        </p>
      </header>

      {resource.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {resource.error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#DDE8E1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#274733]">Create Draft</h2>

        <form onSubmit={handleSubmit(handleCreateDraft)} className="mt-5 grid gap-4">
          <EnterpriseField label="Title" error={errors.title?.message}>
            <EnterpriseInput {...register("title")} placeholder="Draft task title" />
          </EnterpriseField>

          <EnterpriseField label="Description" error={errors.description?.message}>
            <EnterpriseTextarea
              {...register("description")}
              placeholder="Draft description"
              rows={4}
            />
          </EnterpriseField>

          <EnterpriseField label="Priority" error={errors.priority?.message}>
            <EnterpriseSelect {...register("priority")}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </EnterpriseSelect>
          </EnterpriseField>

          <button
            type="submit"
            disabled={isSaving}
            className="w-fit rounded-2xl bg-[#274733] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-[#DDE8E1] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#274733]">Draft Queue</h2>
            <p className="mt-1 text-sm text-[#66756B]">
              Load draft data on demand to avoid render-time side effects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#EAF1EC] px-3 py-1 text-xs font-semibold text-[#3D6B49]">
              {activeDrafts.length} Active Drafts
            </span>

            <button
              type="button"
              onClick={() => void loadDrafts()}
              disabled={resource.isLoading}
              className="rounded-xl border border-[#DDE8E1] bg-white px-4 py-2 text-xs font-semibold text-[#274733] transition hover:bg-[#F7FAF8] disabled:opacity-60"
            >
              {resource.isLoading ? "Loading..." : "Load Drafts"}
            </button>
          </div>
        </div>

        {resource.isLoading ? (
          <p className="mt-6 text-sm text-[#66756B]">Loading drafts...</p>
        ) : activeDrafts.length === 0 ? (
          <p className="mt-6 text-sm text-[#66756B]">
            No drafts loaded yet. Click Load Drafts to fetch current data.
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {activeDrafts.map((draft) => (
              <article
                key={draft.id}
                className="rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[#274733]">{draft.title}</h3>
                    <p className="mt-2 text-sm text-[#66756B]">
                      {draft.description || "No description"}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-[#3D6B49]">
                    {draft.priority}
                  </span>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handlePublish(draft.id)}
                    className="rounded-xl bg-[#3D6B49] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Publish
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(draft.id)}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
