"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";

import { queryKeys } from "@/lib/query/keys";
import { getIdentityOutlets } from "@/services/identity.service";
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

export function AnnouncementsPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AnnouncementCreatePayload>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.announcements.all(),
    queryFn: announcementService.listAll,
  });

  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: AnnouncementCreatePayload) => announcementService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
      setForm(emptyForm);
      setShowForm(false);
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
    createMutation.mutate(form);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#274733]">Employee Announcements</h2>
          <p className="mt-1 text-sm text-slate-500">Broadcast update ke crew outlet</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-[#274733] px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          Buat Pengumuman
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] p-4">
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Judul pengumuman"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={form.body}
            onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            placeholder="Isi pengumuman"
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, priority: event.target.value as AnnouncementPriority }))
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
                setForm((prev) => ({
                  ...prev,
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
                  setForm((prev) => ({ ...prev, requires_acknowledgment: event.target.checked }))
                }
              />
              Wajib konfirmasi
            </label>
          </div>
          {form.target_scope === "outlet" ? (
            <select
              value={form.target_ids?.[0] ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
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
          {form.target_scope !== "all" && form.target_scope !== "outlet" ? (
            <input
              value={(form.target_ids ?? []).join(", ")}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  target_ids: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="Target IDs (pisahkan koma): outlet ID, region, atau district"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full bg-[#3D6B49] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Simpan Draft
          </button>
        </form>
      ) : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-slate-500">Memuat pengumuman...</p>
      ) : (listQuery.data ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada pengumuman.</p>
      ) : (
        <div className="space-y-3">
          {(listQuery.data ?? []).map((item: Announcement) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    <Megaphone className="size-4 text-[#3D6B49]" />
                    {item.title}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.priority.toUpperCase()} · {item.target_scope} ·{" "}
                    {item.published_at ? `Published ${formatTimestamp(item.published_at)}` : "Draft"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!item.published_at ? (
                    <button
                      type="button"
                      onClick={() => publishMutation.mutate(item.id)}
                      disabled={publishMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-full border border-[#DDE8E1] px-3 py-1.5 text-xs font-semibold text-[#3D6B49]"
                    >
                      <Send className="size-3.5" />
                      Publish
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                    Hapus
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
