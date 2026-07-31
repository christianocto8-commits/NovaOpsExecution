"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { useState } from "react";

import { queryKeys } from "@/lib/query/keys";
import {
  getIdentityDistricts,
  getIdentityOutlets,
  getIdentityRegions,
} from "@/services/identity.service";
import {
  announcementService,
  type Announcement,
  type AnnouncementCreatePayload,
  type AnnouncementPriority,
  type AnnouncementTargetScope,
} from "@/services/announcement.service";

const emptyForm: AnnouncementCreatePayload = {
  title: "",
  body: "",
  priority: "normal",
  target_scope: "all",
  target_ids: [],
  requires_acknowledgment: false,
  scheduled_at: null,
  expires_at: null,
};

function formatTimestamp(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function AnnouncementStats({ announcementId }: { announcementId: string }) {
  const statsQuery = useQuery({
    queryKey: ["announcements", announcementId, "analytics"],
    queryFn: () => announcementService.getAnalytics(announcementId),
    retry: false,
  });
  const stats = statsQuery.data;
  if (!stats) return null;

  return (
    <p className="mt-2 text-xs font-medium text-slate-600">
      Delivered {stats.notification_count}/{stats.recipient_count} · Read {stats.read_count}
      {stats.pending_acknowledgment_count > 0
        ? ` · Pending acknowledgment ${stats.pending_acknowledgment_count}`
        : ""}
    </p>
  );
}

export function AnnouncementsPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AnnouncementCreatePayload>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.announcements.all(),
    queryFn: announcementService.listAll,
  });
  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    retry: false,
  });
  const regionsQuery = useQuery({
    queryKey: ["identity", "regions"],
    queryFn: getIdentityRegions,
    retry: false,
  });
  const districtsQuery = useQuery({
    queryKey: ["identity", "districts"],
    queryFn: getIdentityDistricts,
    retry: false,
  });
  const previewQuery = useQuery({
    queryKey: [
      "announcements",
      "preview",
      form.target_scope ?? "all",
      (form.target_ids ?? []).join(","),
    ],
    queryFn: () =>
      announcementService.previewRecipients({
        target_scope: form.target_scope ?? "all",
        target_ids: form.target_ids ?? [],
      }),
    enabled: showForm,
    retry: false,
  });

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  }

  const createMutation = useMutation({
    mutationFn: (payload: AnnouncementCreatePayload) => announcementService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
      resetForm();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnnouncementCreatePayload }) =>
      announcementService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
      resetForm();
    },
  });
  const publishMutation = useMutation({
    mutationFn: (id: string) => announcementService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.active() });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity.feed({}) });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function editAnnouncement(item: Announcement) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      body: item.body,
      priority: item.priority,
      target_scope: item.target_scope,
      target_ids: item.target_ids,
      requires_acknowledgment: item.requires_acknowledgment,
      scheduled_at: item.scheduled_at,
      expires_at: item.expires_at,
    });
    setShowForm(true);
  }

  return (
    <section className="border-y border-slate-200 bg-white py-5 sm:border sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#274733]">Employee Announcements</h2>
          <p className="mt-1 text-sm text-slate-500">Broadcast update ke crew outlet</p>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center gap-2 rounded-full bg-[#274733] px-4 py-2 text-sm font-semibold text-white"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Tutup" : "Buat Pengumuman"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-3 border-y border-[#DDE8E1] bg-[#F7FAF8] p-4 sm:border"
        >
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Judul pengumuman"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            placeholder="Isi pengumuman"
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as AnnouncementPriority,
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={form.target_scope}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_scope: event.target.value as AnnouncementTargetScope,
                  target_ids: [],
                }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">Semua outlet</option>
              <option value="outlet">Outlet terpilih</option>
              <option value="region">Per region</option>
              <option value="district">Per district</option>
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.requires_acknowledgment ?? false}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    requires_acknowledgment: event.target.checked,
                  }))
                }
              />
              Wajib konfirmasi
            </label>
          </div>

          {form.target_scope === "outlet" ? (
            <select
              value={form.target_ids?.[0] ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_ids: event.target.value ? [event.target.value] : [],
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Pilih outlet...</option>
              {(outletsQuery.data ?? []).map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          ) : null}
          {form.target_scope === "region" ? (
            <select
              value={form.target_ids?.[0] ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_ids: event.target.value ? [event.target.value] : [],
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Pilih region...</option>
              {(regionsQuery.data ?? []).map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          ) : null}
          {form.target_scope === "district" ? (
            <select
              value={form.target_ids?.[0] ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  target_ids: event.target.value ? [event.target.value] : [],
                }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Pilih district...</option>
              {(districtsQuery.data ?? []).map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Jadwal publish
              <input
                type="datetime-local"
                value={toLocalInput(form.scheduled_at)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduled_at: fromLocalInput(event.target.value),
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Kedaluwarsa
              <input
                type="datetime-local"
                value={toLocalInput(form.expires_at)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expires_at: fromLocalInput(event.target.value),
                  }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>

          <div className="rounded-xl border border-[#DDE8E1] bg-white px-3 py-2 text-xs text-slate-600">
            {previewQuery.isLoading
              ? "Menghitung penerima..."
              : previewQuery.data
                ? `${previewQuery.data.recipient_count} penerima di ${previewQuery.data.outlet_count} outlet`
                : "Preview penerima belum tersedia"}
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="rounded-full bg-[#3D6B49] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editingId ? "Simpan Perubahan" : "Simpan Draft"}
          </button>
        </form>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-slate-500">Memuat pengumuman...</p>
      ) : (listQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada pengumuman.</p>
      ) : (
        <div className="divide-y divide-slate-200">
          {(listQuery.data ?? []).map((item: Announcement) => (
            <article key={item.id} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    <Megaphone className="size-4 shrink-0 text-[#3D6B49]" />
                    {item.title}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.priority.toUpperCase()} · {item.target_scope} ·{" "}
                    {item.published_at
                      ? `Published ${formatTimestamp(item.published_at)}`
                      : item.scheduled_at
                        ? `Scheduled ${formatTimestamp(item.scheduled_at)}`
                        : "Draft"}
                  </p>
                  {item.published_at ? <AnnouncementStats announcementId={item.id} /> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!item.published_at ? (
                    <>
                      <button
                        type="button"
                        onClick={() => editAnnouncement(item)}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-[#DDE8E1] text-slate-600"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => publishMutation.mutate(item.id)}
                        disabled={publishMutation.isPending}
                        className="inline-flex items-center gap-1 rounded-full border border-[#DDE8E1] px-3 py-1.5 text-xs font-semibold text-[#3D6B49]"
                      >
                        <Send className="size-3.5" />
                        {item.scheduled_at ? "Schedule" : "Publish"}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex size-8 items-center justify-center rounded-full border border-red-100 text-red-600"
                    title="Hapus"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
