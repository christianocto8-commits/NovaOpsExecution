"use client";

import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardPlus,
  Plus,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import {
  getIdentityOutlets,
  getIdentityUsers,
  type IdentityOutlet,
} from "@/services/identity.service";
import {
  incidentService,
  type Incident,
  type IncidentCreatePayload,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/services/incident.service";
import { useLanguage } from "@/shared/i18n";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { useToast } from "@/shared/toast";

const STATUS_OPTIONS: IncidentStatus[] = [
  "reported",
  "triaged",
  "investigating",
  "resolved",
  "closed",
];
const SEVERITY_OPTIONS: IncidentSeverity[] = ["low", "medium", "high", "critical"];
const CATEGORY_OPTIONS = ["operational", "food_safety", "employee", "guest", "security", "equipment"];

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function severityClass(severity: IncidentSeverity) {
  if (severity === "critical") return "bg-red-100 text-red-700";
  if (severity === "high") return "bg-orange-100 text-orange-700";
  if (severity === "medium") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function statusClass(status: IncidentStatus) {
  if (status === "closed" || status === "resolved") return "bg-emerald-100 text-emerald-700";
  if (status === "investigating") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function IncidentsPageContent() {
  const auth = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isOutletWorkspace = workspace.mode === "outlet";
  const canManage = auth.can("incident.manage");
  const canCreate = auth.can("incident.create");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [selected, setSelected] = useState<Incident | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<IncidentCreatePayload>({
    outlet_id: auth.user?.outlet_access.outlet_id ?? "",
    title: "",
    description: "",
    category: "operational",
    severity: "medium",
    occurred_at: localDateTimeValue(),
    due_at: null,
  });
  const [followUp, setFollowUp] = useState({
    title: "",
    instructions: "",
    assignee_id: "",
    priority: "medium" as IncidentSeverity,
    due_at: "",
  });
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});

  const incidentsQuery = useQuery({
    queryKey: ["incidents", statusFilter, severityFilter],
    queryFn: () =>
      incidentService.list({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      }),
  });
  const summaryQuery = useQuery({
    queryKey: ["incidents", "summary"],
    queryFn: incidentService.summary,
    enabled: !isOutletWorkspace,
  });
  const outletsQuery = useQuery({
    queryKey: ["identity-outlets", "incident-form"],
    queryFn: getIdentityOutlets,
    enabled: auth.can("outlet.read"),
  });
  const usersQuery = useQuery({
    queryKey: ["identity-users", "incident-follow-up"],
    queryFn: getIdentityUsers,
    enabled: canManage,
  });

  const outlets = useMemo<IdentityOutlet[]>(() => {
    if (outletsQuery.data?.length) return outletsQuery.data;
    return auth.user?.outlet_access.outlets ?? [];
  }, [auth.user?.outlet_access.outlets, outletsQuery.data]);

  useEffect(() => {
    if (!canCreate) return;
    if (searchParams.get("create") === "1") {
      setShowCreate(true);
    }
  }, [canCreate, searchParams]);

  useEffect(() => {
    if (!isOutletWorkspace) return;
    const outletId = workspace.outletId || auth.user?.outlet_access.outlet_id || "";
    if (!outletId) return;
    setForm((current) =>
      current.outlet_id === outletId ? current : { ...current, outlet_id: outletId }
    );
  }, [auth.user?.outlet_access.outlet_id, isOutletWorkspace, workspace.outletId]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["incidents"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: incidentService.create,
    onSuccess: async (incident) => {
      toast.success("Incident berhasil dilaporkan.");
      setShowCreate(false);
      setSelected(incident);
      setForm((current) => ({
        ...current,
        title: "",
        description: "",
        occurred_at: localDateTimeValue(),
      }));
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Incident gagal dibuat."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Incident> }) =>
      incidentService.update(id, payload),
    onSuccess: async (incident) => {
      setSelected(incident);
      toast.success("Incident diperbarui.");
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update gagal."),
  });
  const followUpMutation = useMutation({
    mutationFn: incidentService.createFollowUp,
    onSuccess: async () => {
      toast.success("Follow-up action dibuat.");
      setFollowUp({
        title: "",
        instructions: "",
        assignee_id: "",
        priority: "medium",
        due_at: "",
      });
      await refresh();
      if (selected) {
        const latest = await incidentService.list();
        setSelected(latest.find((item) => item.id === selected.id) ?? selected);
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Follow-up gagal dibuat."),
  });
  const followUpUpdateMutation = useMutation({
    mutationFn: ({
      id,
      status,
      completion_note,
    }: {
      id: string;
      status: "in_progress" | "completed";
      completion_note?: string | null;
    }) => incidentService.updateFollowUp(id, { status, completion_note }),
    onSuccess: async () => {
      toast.success("Follow-up diperbarui.");
      await refresh();
      if (selected) {
        const latest = await incidentService.list();
        setSelected(latest.find((item) => item.id === selected.id) ?? selected);
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update gagal."),
  });

  const summary = summaryQuery.data;
  const cards = [
    { label: "Open", value: summary?.open ?? 0, icon: CircleAlert, tone: "text-blue-700" },
    {
      label: "Critical",
      value: summary?.critical_open ?? 0,
      icon: AlertTriangle,
      tone: "text-red-700",
    },
    { label: "Overdue", value: summary?.overdue ?? 0, icon: AlertTriangle, tone: "text-amber-700" },
    {
      label: "Resolved",
      value: summary?.resolved ?? 0,
      icon: CheckCircle2,
      tone: "text-emerald-700",
    },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            {isOutletWorkspace ? t("incidents.outletEyebrow") : "Execution"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            {isOutletWorkspace ? t("incidents.outletTitle") : "Incidents"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isOutletWorkspace
              ? t("incidents.outletSubtitle")
              : "Report, investigate, resolve, and follow up operational incidents."}
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
          >
            <Plus className="size-4" />
            {isOutletWorkspace ? t("incidents.reportCta") : "Report incident"}
          </button>
        ) : null}
      </header>

      {!isOutletWorkspace ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className={`flex items-center gap-2 text-xs font-semibold uppercase ${tone}`}>
                <Icon className="size-4" />
                {label}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {!isOutletWorkspace ? (
        <section className="flex flex-col gap-3 border-y border-slate-200 py-4 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label="Filter status"
          >
            <option value="">All status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
            aria-label="Filter severity"
          >
            <option value="">All severity</option>
            {SEVERITY_OPTIONS.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </section>
      ) : null}

      <section className="overflow-hidden border-y border-slate-200 bg-white">
        {incidentsQuery.isLoading ? (
          <p className="p-5 text-sm text-slate-500">Loading incidents...</p>
        ) : incidentsQuery.data?.length ? (
          incidentsQuery.data.map((incident) => (
            <button
              type="button"
              key={incident.id}
              onClick={() => setSelected(incident)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-1 py-4 text-left last:border-0 hover:bg-slate-50 sm:px-4"
            >
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${severityClass(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-950">{incident.title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {incident.category.replace("_", " ")} · {new Date(incident.occurred_at).toLocaleString()}
                </span>
              </span>
              <span className={`hidden rounded-full px-2 py-1 text-xs font-semibold sm:inline ${statusClass(incident.status)}`}>
                {incident.status}
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400" />
            </button>
          ))
        ) : (
          <p className="p-5 text-sm text-slate-500">No incidents in this scope.</p>
        )}
      </section>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate({
                ...form,
                occurred_at: new Date(form.occurred_at).toISOString(),
                due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
              });
            }}
            className="max-h-[92dvh] w-full overflow-y-auto bg-white p-5 sm:max-w-xl sm:rounded-lg"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">
                {isOutletWorkspace ? t("incidents.reportCta") : "Report incident"}
              </h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              {isOutletWorkspace ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {workspace.outletName || outlets[0]?.name || "Outlet"}
                </p>
              ) : (
                <label className="grid gap-1 text-sm font-medium">
                  Outlet
                  <select
                    required
                    value={form.outlet_id}
                    onChange={(event) => setForm({ ...form, outlet_id: event.target.value })}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                  >
                    <option value="">Select outlet</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="grid gap-1 text-sm font-medium">
                Title
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Description
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="rounded-lg border border-slate-300 p-3 font-normal"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">
                  Category
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category}>
                        {category.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Severity
                  <select
                    value={form.severity}
                    onChange={(event) =>
                      setForm({ ...form, severity: event.target.value as IncidentSeverity })
                    }
                    className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                  >
                    {SEVERITY_OPTIONS.map((severity) => (
                      <option key={severity}>{severity}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-sm font-medium">
                Occurred at
                <input
                  required
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(event) => setForm({ ...form, occurred_at: event.target.value })}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 font-normal"
                />
              </label>
              <button
                disabled={createMutation.isPending}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50"
              >
                {createMutation.isPending ? "Saving..." : "Submit incident"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40">
          <aside className="h-full w-full overflow-y-auto bg-white p-5 sm:max-w-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-700">Incident detail</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selected.title}</h2>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityClass(selected.severity)}`}>
                {selected.severity}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(selected.status)}`}>
                {selected.status}
              </span>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm text-slate-700">{selected.description}</p>

            {canManage ? (
              <section className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="font-semibold text-slate-950">Investigation</h3>
                <div className="mt-3 grid gap-3">
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      updateMutation.mutate({
                        id: selected.id,
                        payload: { status: event.target.value as IncidentStatus },
                      })
                    }
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <textarea
                    rows={3}
                    placeholder="Root cause"
                    value={selected.root_cause ?? ""}
                    onChange={(event) => setSelected({ ...selected, root_cause: event.target.value })}
                    className="rounded-lg border border-slate-300 p-3 text-sm"
                  />
                  <textarea
                    rows={3}
                    placeholder="Resolution"
                    value={selected.resolution ?? ""}
                    onChange={(event) => setSelected({ ...selected, resolution: event.target.value })}
                    className="rounded-lg border border-slate-300 p-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateMutation.mutate({
                        id: selected.id,
                        payload: {
                          root_cause: selected.root_cause,
                          resolution: selected.resolution,
                        },
                      })
                    }
                    className="min-h-11 rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-700"
                  >
                    Save investigation
                  </button>
                </div>
              </section>
            ) : null}

            <section className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2">
                <ClipboardPlus className="size-4 text-emerald-700" />
                <h3 className="font-semibold text-slate-950">Follow-up actions</h3>
              </div>
              <div className="mt-3 space-y-2">
                {selected.follow_ups.length ? (
                  selected.follow_ups.map((action) => (
                    <div key={action.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{action.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{action.instructions}</p>
                        </div>
                        <span className="text-xs font-bold uppercase text-slate-600">{action.status}</span>
                      </div>
                      {action.status !== "completed" &&
                      action.status !== "cancelled" &&
                      (canManage ||
                        action.assignee_id === null ||
                        action.assignee_id === auth.user?.user.id) ? (
                        <div className="mt-3 grid gap-2">
                          <textarea
                            rows={2}
                            placeholder="Catatan penyelesaian"
                            value={completionNotes[action.id] ?? action.completion_note ?? ""}
                            onChange={(event) =>
                              setCompletionNotes((current) => ({
                                ...current,
                                [action.id]: event.target.value,
                              }))
                            }
                            className="rounded-lg border border-slate-300 p-2 text-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            {action.status === "open" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  followUpUpdateMutation.mutate({
                                    id: action.id,
                                    status: "in_progress",
                                  })
                                }
                                className="min-h-10 rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-700"
                              >
                                Mulai
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                followUpUpdateMutation.mutate({
                                  id: action.id,
                                  status: "completed",
                                  completion_note: completionNotes[action.id]?.trim() || null,
                                })
                              }
                              className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white"
                            >
                              Selesaikan
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No follow-up actions.</p>
                )}
              </div>

              {canManage ? (
                <div className="mt-4 grid gap-3 bg-slate-50 p-4">
                  <input
                    placeholder="Action title"
                    value={followUp.title}
                    onChange={(event) => setFollowUp({ ...followUp, title: event.target.value })}
                    className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                  />
                  <textarea
                    rows={2}
                    placeholder="Instructions"
                    value={followUp.instructions}
                    onChange={(event) =>
                      setFollowUp({ ...followUp, instructions: event.target.value })
                    }
                    className="rounded-lg border border-slate-300 p-3 text-sm"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={followUp.assignee_id}
                      onChange={(event) =>
                        setFollowUp({ ...followUp, assignee_id: event.target.value })
                      }
                      className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {usersQuery.data?.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      value={followUp.due_at}
                      onChange={(event) => setFollowUp({ ...followUp, due_at: event.target.value })}
                      className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!followUp.title || followUpMutation.isPending}
                    onClick={() =>
                      followUpMutation.mutate({
                        incident_id: selected.id,
                        outlet_id: selected.outlet_id,
                        assignee_id: followUp.assignee_id || null,
                        title: followUp.title,
                        instructions: followUp.instructions || null,
                        priority: followUp.priority,
                        due_at: followUp.due_at
                          ? new Date(followUp.due_at).toISOString()
                          : null,
                      })
                    }
                    className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Create follow-up
                  </button>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[60vh] items-center justify-center">
          <div className="text-sm text-slate-500">Loading incidents...</div>
        </main>
      }
    >
      <IncidentsPageContent />
    </Suspense>
  );
}
