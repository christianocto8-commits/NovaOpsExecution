"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  WEBHOOK_EVENT_OPTIONS,
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  listWebhooks,
  retryWebhookDelivery,
  type WebhookEventType,
  type WebhookSubscription,
  testWebhook,
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
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(["task.completed"]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<"all" | "delivered" | "failed">("all");
  const [deliveryEvent, setDeliveryEvent] = useState<WebhookEventType | "all">("all");
  const [deliverySubscriptionId, setDeliverySubscriptionId] = useState("all");

  const webhooksQuery = useQuery({
    queryKey: ["webhooks"],
    queryFn: listWebhooks,
    retry: false,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["webhook-deliveries", deliverySubscriptionId],
    queryFn: () =>
      listWebhookDeliveries({
        limit: 100,
        subscriptionId: deliverySubscriptionId === "all" ? undefined : deliverySubscriptionId,
      }),
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
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateWebhook(id, { active }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: async (result) => {
      setNotice(
        result.delivered
          ? `Test delivery succeeded${result.http_status ? ` (HTTP ${result.http_status})` : ""}.`
          : `Test delivery failed${result.error_message ? `: ${result.error_message}` : "."}`
      );
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to send test webhook."
      );
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryWebhookDelivery,
    onSuccess: async (result) => {
      setNotice(
        result.delivered
          ? `Retry delivery succeeded${result.http_status ? ` (HTTP ${result.http_status})` : ""}.`
          : `Retry delivery failed${result.error_message ? `: ${result.error_message}` : "."}`
      );
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to retry webhook delivery."
      );
    },
  });

  const webhooks = webhooksQuery.data ?? [];
  const deliveries = useMemo(
    () =>
      (deliveriesQuery.data ?? []).filter((delivery) => {
        if (deliveryStatus !== "all" && delivery.status !== deliveryStatus) return false;
        if (deliveryEvent !== "all" && delivery.event_type !== deliveryEvent) return false;
        return true;
      }),
    [deliveriesQuery.data, deliveryEvent, deliveryStatus]
  );

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
          Owner/admin dapat mendaftarkan endpoint HTTP untuk menerima event operasional dengan tanda
          tangan HMAC.
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
          <div
            key={item.value}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
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
              <EnterpriseInput value={secret} onChange={(event) => setSecret(event.target.value)} />
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
                <div
                  key={webhook.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
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
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => testMutation.mutate(webhook.id)}
                      disabled={testMutation.isPending}
                      className="text-sm font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      {testMutation.isPending ? "Sending test..." : "Send test"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(webhook.id)}
                      className="text-sm font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Belum ada webhook terdaftar.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Recent deliveries</h2>
            <p className="mt-1 text-sm text-slate-500">
              Log pengiriman webhook dengan status, retry, dan error message.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={deliverySubscriptionId}
              onChange={(event) => setDeliverySubscriptionId(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">All subscriptions</option>
              {webhooks.map((webhook) => (
                <option key={webhook.id} value={webhook.id}>
                  {webhook.description || webhook.url}
                </option>
              ))}
            </select>
            <select
              value={deliveryStatus}
              onChange={(event) => setDeliveryStatus(event.target.value as typeof deliveryStatus)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">All status</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={deliveryEvent}
              onChange={(event) => setDeliveryEvent(event.target.value as WebhookEventType | "all")}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">All events</option>
              {WEBHOOK_EVENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {deliveriesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading delivery log...</p>
          ) : deliveries.length ? (
            deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-950">{delivery.event_type}</p>
                  <span
                    className={[
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      delivery.status === "delivered"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800",
                    ].join(" ")}
                  >
                    {delivery.status} · {delivery.attempt_count}x
                  </span>
                </div>
                <p className="mt-1 truncate text-slate-600">{delivery.url}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(delivery.created_at).toLocaleString()}
                  {delivery.http_status ? ` · HTTP ${delivery.http_status}` : ""}
                </p>
                {delivery.error_message ? (
                  <p className="mt-1 text-xs text-red-700">{delivery.error_message}</p>
                ) : null}
                {delivery.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => retryMutation.mutate(delivery.id)}
                    disabled={retryMutation.isPending}
                    className="mt-3 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  >
                    {retryMutation.isPending ? "Retrying..." : "Retry delivery"}
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Belum ada delivery. Aktifkan webhook di Settings dan trigger event operasional.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
