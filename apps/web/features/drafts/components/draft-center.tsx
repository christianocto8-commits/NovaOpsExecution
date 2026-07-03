"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createTaskDraft,
  deleteTaskDraft,
  getTaskDrafts,
  publishTaskDraft,
  type TaskDraft,
} from "@/services/draft.service";

const priorities = ["low", "medium", "high", "critical"];

export function DraftCenter() {
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDrafts = useMemo(
    () => drafts.filter((draft) => draft.status === "draft"),
    [drafts]
  );

  async function loadDrafts() {
    try {
      setError(null);
      const data = await getTaskDrafts();
      setDrafts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts();
  }, []);

  async function handleCreateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const priority = String(formData.get("priority") ?? "medium");

    if (!title) {
      setError("Draft title is required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await createTaskDraft({
        title,
        description,
        priority,
      });

      form.reset();
      await loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create draft");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish(draftId: number) {
    try {
      setError(null);
      await publishTaskDraft(draftId);
      await loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish draft");
    }
  }

  async function handleDelete(draftId: number) {
    try {
      setError(null);
      await deleteTaskDraft(draftId);
      await loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3D6B49]">
          Sprint 05.3
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#274733]">
          Draft Center
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#66756B]">
          Prepare task drafts before publishing them into live operational task
          execution.
        </p>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-[#DDE8E1] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#274733]">Create Draft</h2>

        <form onSubmit={handleCreateDraft} className="mt-5 grid gap-4">
          <input
            name="title"
            placeholder="Draft task title"
            className="rounded-2xl border border-[#DDE8E1] px-4 py-3 text-sm outline-none focus:border-[#3D6B49]"
          />

          <textarea
            name="description"
            placeholder="Draft description"
            rows={4}
            className="rounded-2xl border border-[#DDE8E1] px-4 py-3 text-sm outline-none focus:border-[#3D6B49]"
          />

          <select
            name="priority"
            defaultValue="medium"
            className="rounded-2xl border border-[#DDE8E1] px-4 py-3 text-sm outline-none focus:border-[#3D6B49]"
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#274733]">Draft Queue</h2>
          <span className="rounded-full bg-[#EAF1EC] px-3 py-1 text-xs font-semibold text-[#3D6B49]">
            {activeDrafts.length} Active Drafts
          </span>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-[#66756B]">Loading drafts...</p>
        ) : activeDrafts.length === 0 ? (
          <p className="mt-6 text-sm text-[#66756B]">No drafts yet.</p>
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
                    onClick={() => void handlePublish(draft.id)}
                    className="rounded-xl bg-[#3D6B49] px-4 py-2 text-xs font-semibold text-white"
                  >
                    Publish
                  </button>

                  <button
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