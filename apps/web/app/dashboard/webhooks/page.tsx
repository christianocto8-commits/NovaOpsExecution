"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  WEBHOOK_EVENT_OPTIONS,
  createWebhook,
  deleteWebhook,
  listWebhooks,
  type WebhookEventType,
  type WebhookSubscription,
  updateWebhook,
} from "@/services/webhook.service";
import { EnterpriseCheckbox, EnterpriseField, EnterpriseInput } from "@/shared/form";

function generateSecret() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `whsec_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState(generateSecret);
  const [description, setDescription] = useState("");
  const [outletId, setOutletId] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    "task.completed",
  ]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const webhooksQuery = useQuery({
    queryKey: ["webhooks"],
    queryFn: listWebhooks,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: async () => {
      setNotice("Webhook subscription created.");
      setError(null);
      setUrl("");
      setDescription("");
      setOutletId("");
      setSecret(generateSecret());
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (mutationError) => {
      setNotice(null);
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to create webhook."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: async () => {
      setNotice("Webhook deleted.");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to delete webhook."
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateWebhook(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const webhooks = webhooksQuery.data ?? [];

  const eventSummary = useMemo(
    () =>
      WEBHOOK_EVENT_OPTIONS.map((option) => ({
        ...option,
        count: webhooks.filter((webhook) => webhook.events.includes(option.value)).length,
      })),
    [webhooks]
  );

  function toggleEvent(event: WebhookEventType) {
    setSelectedEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event]
    );
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setError(null);

    if (!url.trim()) {
      setError("Webhook URL is required.");
      return;
    }

    if (selectedEvents.length === 0) {
      setError("Select at least one event.");
      return;
    }

    createMutation.mutate({
      url: url.trim(),
      secret,
      events: selectedEvents,
      active: true,
      outlet_id: outletId.trim() ? Number(outletId) : null,
      description: description.trim() || null,
    });
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Integrations</p>
        <h1 className="text-2xl font-semibold text-slate-950">Webhook Subscriptions</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Owner/admin dapat mendaftarkan endpoint HTTP untuk menerima event operasional dengan
          tanda tangan HMAC.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {eventSummary.map((item) => (
          <div key={item.value} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{item.count}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <form
          onSubmit={handleCreate}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">Add webhook</h2>
          <div className="mt-5 space-y-4">
            <EnterpriseField label="Endpoint URL">
              <EnterpriseInput
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/hooks/novaops"
              />
            </EnterpriseField>

            <EnterpriseField label="Signing secret">
              <EnterpriseInput
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </EnterpriseField>

            <EnterpriseField label="Outlet ID (optional)">
              <EnterpriseInput
                value={outletId}
                onChange={(event) => setOutletId(event.target.value)}
                placeholder="Kosongkan untuk org-wide"
              />
            </EnterpriseField>

            <EnterpriseField label="Description">
              <EnterpriseInput
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </EnterpriseField>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Events</p>
              {WEBHOOK_EVENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <EnterpriseCheckbox
                    checked={selectedEvents.includes(option.value)}
                    onChange={() => toggleEvent(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300"
            >
              {createMutation.isPending ? "Saving..." : "Create webhook"}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Active subscriptions</h2>
          <div className="mt-5 space-y-3">
            {webhooksQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading webhooks...</p>
            ) : webhooks.length ? (
              webhooks.map((webhook: WebhookSubscription) => (
                <div key={webhook.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-semibold text-slate-950">{webhook.url}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {webhook.events.join(", ")}
                        {webhook.outlet_id ? ` · Outlet ${webhook.outlet_id}` : " · Org-wide"}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <EnterpriseCheckbox
                        checked={webhook.active}
                        onChange={(event) =>
                          toggleMutation.mutate({ id: webhook.id, active: event.target.checked })
                        }
                      />
                      Active
                    </label>
                  </div>
                  {webhook.description ? (
                    <p className="mt-2 text-sm text-slate-500">{webhook.description}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(webhook.id)}
                    className="mt-3 text-sm font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Belum ada webhook terdaftar.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
