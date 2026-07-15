"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/services/notification.service";
import type {
  UUID,
  WorkflowNotificationTemplate,
  WorkflowNotificationTemplateCreate,
} from "@/features/workflows/types";

type NotificationTemplatesPanelProps = {
  workflowId: UUID;
};

type TemplateFormState = {
  event: string;
  channel: string;
  title_template: string;
  body_template: string;
  enabled: boolean;
};

const emptyForm: TemplateFormState = {
  event: "workflow.submitted",
  channel: "in_app",
  title_template: "Workflow submitted",
  body_template: "A workflow has been submitted and requires attention.",
  enabled: true,
};

const eventOptions = [
  "workflow.submitted",
  "workflow.approved",
  "workflow.rejected",
  "workflow.returned",
  "workflow.escalated",
  "workflow.completed",
];

export function NotificationTemplatesPanel({ workflowId }: NotificationTemplatesPanelProps) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["workflow-notification-templates", workflowId],
    [workflowId],
  );

  const [form, setForm] = useState<TemplateFormState>(emptyForm);
  const [editingId, setEditingId] = useState<UUID | null>(null);
  const [error, setError] = useState("");

  const templatesQuery = useQuery({
    queryKey,
    queryFn: () => notificationService.listWorkflowTemplates(workflowId),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: WorkflowNotificationTemplateCreate) => {
      if (editingId) {
        return notificationService.updateWorkflowTemplate(editingId, {
          event: payload.event,
          channel: payload.channel,
          title_template: payload.title_template,
          body_template: payload.body_template,
          enabled: payload.enabled,
        });
      }

      return notificationService.createWorkflowTemplate(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setForm(emptyForm);
      setEditingId(null);
      setError("");
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Failed to save template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: UUID) => notificationService.removeWorkflowTemplate(templateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Failed to delete template",
      );
    },
  });

  function editTemplate(template: WorkflowNotificationTemplate) {
    setEditingId(template.id);
    setForm({
      event: template.event,
      channel: template.channel,
      title_template: template.title_template,
      body_template: template.body_template,
      enabled: template.enabled,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function saveTemplate() {
    if (!form.event.trim() || !form.title_template.trim() || !form.body_template.trim()) {
      setError("Event, title template, and body template are required.");
      return;
    }

    saveMutation.mutate({
      workflow_id: workflowId,
      event: form.event.trim(),
      channel: form.channel.trim() || "in_app",
      title_template: form.title_template.trim(),
      body_template: form.body_template.trim(),
      enabled: form.enabled,
    });
  }

  const templates = templatesQuery.data ?? [];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Notification Templates</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">Workflow notification rules</h3>
          <p className="mt-1 text-sm text-slate-500">
            Configure in-app messages for workflow lifecycle events.
          </p>
        </div>

        {editingId ? (
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        <label className="lg:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Event</span>
          <select
            value={form.event}
            onChange={(event) => setForm((current) => ({ ...current, event: event.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {eventOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Channel</span>
          <input
            value={form.channel}
            onChange={(event) =>
              setForm((current) => ({ ...current, channel: event.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          />
        </label>

        <label className="lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Title</span>
          <input
            value={form.title_template}
            onChange={(event) =>
              setForm((current) => ({ ...current, title_template: event.target.value }))
            }
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          />
        </label>

        <label className="flex items-end gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) =>
              setForm((current) => ({ ...current, enabled: event.target.checked }))
            }
            className="h-4 w-4"
          />
          <span className="text-sm font-semibold text-slate-700">Enabled</span>
        </label>

        <label className="lg:col-span-5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Body</span>
          <textarea
            value={form.body_template}
            onChange={(event) =>
              setForm((current) => ({ ...current, body_template: event.target.value }))
            }
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={saveTemplate}
          disabled={saveMutation.isPending}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {editingId ? "Update template" : "Add template"}
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {templatesQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading templates...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No notification templates yet.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{template.event}</td>
                  <td className="px-4 py-3 text-slate-600">{template.channel}</td>
                  <td className="px-4 py-3 text-slate-600">{template.title_template}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        template.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {template.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => editTemplate(template)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(template.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
