"use client";

import { FormEvent, useEffect, useState } from "react";
import { DraftTask } from "../types";
import { DraftStatusBadge } from "./draft-status-badge";
import { publishDraft, updateDraft } from "../api";

type Props = {
  draft: DraftTask | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

export function DraftDetailDrawer({ draft, open, onClose, onUpdated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!draft) return;

    setTitle(draft.title ?? "");
    setDescription(draft.description ?? "");
    setPriority(draft.priority ?? "");
    setDueDate(draft.due_date ? draft.due_date.slice(0, 10) : "");
  }, [draft]);

  if (!open || !draft) return null;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    setIsSaving(true);

    try {
      await updateDraft(draft.id, {
        title,
        description,
        priority: priority || null,
        due_date: dueDate || null,
      });

      onUpdated();
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!draft) return;

    setIsPublishing(true);

    try {
      await publishDraft(draft.id);
      onUpdated();
      onClose();
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close drawer overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Draft Detail</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {draft.title}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-4">
            <DraftStatusBadge status={draft.status} />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 px-6 py-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || draft.status === "published"}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
            >
              {isPublishing ? "Publishing..." : "Publish to Active Task"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}