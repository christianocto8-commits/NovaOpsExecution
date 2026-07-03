"use client";

import { useMemo, useState } from "react";
import { DraftItem, DraftStatus } from "../services/drafts-api";
import { useDeleteDraft, useDrafts, usePublishDraft } from "../hooks/use-drafts";

const statusTabs: Array<{ label: string; value: "all" | DraftStatus }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending Review", value: "pending_review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

function statusLabel(status: DraftStatus) {
  const labels: Record<DraftStatus, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    published: "Published",
    archived: "Archived",
  };

  return labels[status];
}

function statusClass(status: DraftStatus) {
  const classes: Record<DraftStatus, string> = {
    draft: "bg-slate-100 text-slate-700",
    pending_review: "bg-amber-50 text-amber-700",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-zinc-100 text-zinc-500",
  };

  return classes[status];
}

function VersionBadge({ version }: { version: string }) {
  return (
    <span className="rounded-full border bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
      {version}
    </span>
  );
}

function DraftPreviewDrawer({
  draft,
  onClose,
  onPublish,
  onDelete,
  isPublishing,
  isDeleting,
}: {
  draft: DraftItem | null;
  onClose: () => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
  isPublishing: boolean;
  isDeleting: boolean;
}) {
  if (!draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        aria-label="Close drawer overlay"
        className="flex-1"
        onClick={onClose}
      />

      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        <div className="border-b px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <VersionBadge version={draft.version} />
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                    draft.status,
                  )}`}
                >
                  {statusLabel(draft.status)}
                </span>
              </div>

              <h2 className="text-xl font-semibold text-slate-950">
                {draft.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {draft.module} • {draft.outlet}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-950">
              Draft Preview
            </h3>
            <p className="mt-2 rounded-xl border bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {draft.summary}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-xs text-slate-500">Owner</p>
              <p className="mt-1 text-sm font-medium text-slate-950">
                {draft.owner}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-slate-500">Updated</p>
              <p className="mt-1 text-sm font-medium text-slate-950">
                {draft.updatedAt}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-slate-500">Module</p>
              <p className="mt-1 text-sm font-medium text-slate-950">
                {draft.module}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-xs text-slate-500">Outlet Scope</p>
              <p className="mt-1 text-sm font-medium text-slate-950">
                {draft.outlet}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-950">
              Version History
            </h3>

            <div className="mt-3 space-y-2">
              <div className="rounded-xl border p-3 text-sm text-slate-600">
                {draft.version} — Current version updated {draft.updatedAt}
              </div>
              <div className="rounded-xl border p-3 text-sm text-slate-500">
                Previous version — Content reviewed by workspace owner
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-white px-6 py-4">
          <button
            onClick={() => onDelete(draft.id)}
            disabled={isDeleting}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>

          <button className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Duplicate
          </button>

          <button
            onClick={() => onPublish(draft.id)}
            disabled={isPublishing || draft.status === "published"}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {draft.status === "published"
              ? "Published"
              : isPublishing
                ? "Publishing..."
                : "Publish"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function DraftCenterWorkspace() {
  const { data, isLoading } = useDrafts();
  const publishDraft = usePublishDraft();
  const deleteDraft = useDeleteDraft();

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | DraftStatus>("all");
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [selectedDraft, setSelectedDraft] = useState<DraftItem | null>(null);

  const modules = useMemo(() => {
    return ["All Modules", ...(data?.items.map((item) => item.module) ?? [])];
  }, [data]);

  const filteredDrafts = useMemo(() => {
    const items = data?.items ?? [];
    const keyword = search.toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(keyword) ||
        item.module.toLowerCase().includes(keyword) ||
        item.outlet.toLowerCase().includes(keyword) ||
        item.owner.toLowerCase().includes(keyword);

      const matchesStatus =
        activeStatus === "all" || item.status === activeStatus;

      const matchesModule =
        moduleFilter === "All Modules" || item.module === moduleFilter;

      return matchesSearch && matchesStatus && matchesModule;
    });
  }, [data, search, activeStatus, moduleFilter]);

  function handlePublish(id: string) {
    publishDraft.mutate(id, {
      onSuccess: (updatedDraft) => {
        setSelectedDraft(updatedDraft);
      },
    });
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this draft? This action cannot be undone.",
    );

    if (!confirmed) return;

    deleteDraft.mutate(id, {
      onSuccess: () => {
        setSelectedDraft(null);
      },
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading drafts...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Draft Center
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage enterprise drafts, approvals, publishing, and version control.
            </p>
          </div>

          <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white">
            New Draft
          </button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search drafts, modules, outlets, owners..."
            className="h-10 w-full rounded-xl border px-3 text-sm outline-none focus:border-slate-400 lg:max-w-md"
          />

          <select
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value)}
            className="h-10 rounded-xl border px-3 text-sm"
          >
            {modules.map((module) => (
              <option key={module}>{module}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={
                activeStatus === tab.value
                  ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  : "rounded-xl border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Draft</th>
                <th className="px-5 py-3 font-medium">Module</th>
                <th className="px-5 py-3 font-medium">Outlet</th>
                <th className="px-5 py-3 font-medium">Version</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredDrafts.map((draft) => (
                <tr key={draft.id} className="border-t">
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setSelectedDraft(draft)}
                      className="text-left font-medium text-slate-950 hover:underline"
                    >
                      {draft.title}
                    </button>
                    <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                      {draft.summary}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-slate-600">{draft.module}</td>
                  <td className="px-5 py-4 text-slate-600">{draft.outlet}</td>
                  <td className="px-5 py-4">
                    <VersionBadge version={draft.version} />
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                        draft.status,
                      )}`}
                    >
                      {statusLabel(draft.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{draft.owner}</td>
                  <td className="px-5 py-4 text-slate-500">{draft.updatedAt}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedDraft(draft)}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}

              {filteredDrafts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    No drafts found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-4 text-sm text-slate-500">
          <span>
            Showing {filteredDrafts.length} of {data?.items.length ?? 0} drafts
          </span>

          <div className="flex gap-2">
            <button className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">
              Previous
            </button>
            <button className="rounded-lg border px-3 py-1.5 hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </section>

      <DraftPreviewDrawer
        draft={selectedDraft}
        onClose={() => setSelectedDraft(null)}
        onPublish={handlePublish}
        onDelete={handleDelete}
        isPublishing={publishDraft.isPending}
        isDeleting={deleteDraft.isPending}
      />
    </div>
  );
}