"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { DraftTask } from "../types";
import { DraftStatusBadge } from "./draft-status-badge";
import { publishDraft, updateDraft } from "../api";
import {
  EnterpriseField,
  EnterpriseInput,
  EnterpriseSelect,
  EnterpriseTextarea,
} from "@/shared/form";

const draftDetailSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.string().optional(),
  due_date: z.string().optional(),
});

type DraftDetailFormValues = z.infer<typeof draftDetailSchema>;

type Props = {
  draft: DraftTask | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
};

function getDraftFormValues(draft: DraftTask | null): DraftDetailFormValues {
  return {
    title: draft?.title ?? "",
    description: draft?.description ?? "",
    priority: draft?.priority ?? "",
    due_date: draft?.due_date ? draft.due_date.slice(0, 10) : "",
  };
}

export function DraftDetailDrawer({ draft, open, onClose, onUpdated }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const formValues = useMemo(() => getDraftFormValues(draft), [draft]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DraftDetailFormValues>({
    resolver: zodResolver(draftDetailSchema),
    values: formValues,
  });

  if (!open || !draft) return null;

  async function handleSave(values: DraftDetailFormValues) {
    if (!draft) return;

    setIsSaving(true);

    try {
      await updateDraft(draft.id, {
        title: values.title,
        description: values.description ?? "",
        priority: values.priority || null,
        due_date: values.due_date || null,
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
        type="button"
        aria-label="Close drawer overlay"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Draft Detail
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {draft.title}
              </h2>
            </div>

            <button
              type="button"
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

        <form onSubmit={handleSubmit(handleSave)} className="space-y-5 px-6 py-6">
          <EnterpriseField label="Title" error={errors.title?.message}>
            <EnterpriseInput {...register("title")} required />
          </EnterpriseField>

          <EnterpriseField
            label="Description"
            error={errors.description?.message}
          >
            <EnterpriseTextarea {...register("description")} rows={6} />
          </EnterpriseField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EnterpriseField label="Priority" error={errors.priority?.message}>
              <EnterpriseSelect {...register("priority")}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </EnterpriseSelect>
            </EnterpriseField>

            <EnterpriseField label="Due Date" error={errors.due_date?.message}>
              <EnterpriseInput type="date" {...register("due_date")} />
            </EnterpriseField>
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
