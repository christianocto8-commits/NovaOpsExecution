"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { getSettings, updateSettings } from "@/features/settings/settings-api";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { ActionCard } from "@/shared/ui/cards/action-card";
import { MetricCard } from "@/shared/ui/cards/metric-card";
import { SectionCard } from "@/shared/ui/cards/section-card";

type SettingsTab = "organization" | "operations" | "notifications" | "security";

const tabs: { id: SettingsTab; label: string; description: string }[] = [
  {
    id: "organization",
    label: "Organization",
    description: "Company identity, timezone, and workspace profile.",
  },
  {
    id: "operations",
    label: "Operations",
    description: "Outlet standards, task rules, and approval behavior.",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Email, dashboard, and operational alert preferences.",
  },
  {
    id: "security",
    label: "Security",
    description: "Session, role, and access control configuration.",
  },
];

export function SettingsWorkspace() {
  const { settings, isLoading, error, reload } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("organization");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    organization_name: "",
    workspace_name: "",
    timezone: "Asia/Jakarta",
    default_language: "en",
    task_auto_archive_days: "30",
    evidence_required: true,
    approval_required: true,
    email_notifications: true,
    dashboard_alerts: true,
    overdue_alerts: true,
    session_timeout_minutes: "120",
    enforce_role_permissions: true,
  });

  useEffect(() => {
    if (!settings) return;

    setForm({
      organization_name: settings.organization_name ?? "",
      workspace_name: settings.workspace_name ?? "",
      timezone: settings.timezone ?? "Asia/Jakarta",
      default_language: settings.default_language ?? "en",
      task_auto_archive_days: String(settings.task_auto_archive_days ?? 30),
      evidence_required: Boolean(settings.evidence_required),
      approval_required: Boolean(settings.approval_required),
      email_notifications: Boolean(settings.email_notifications),
      dashboard_alerts: Boolean(settings.dashboard_alerts),
      overdue_alerts: Boolean(settings.overdue_alerts),
      session_timeout_minutes: String(settings.session_timeout_minutes ?? 120),
      enforce_role_permissions: Boolean(settings.enforce_role_permissions),
    });
  }, [settings]);

  const completionScore = useMemo(() => {
    let score = 0;

    if (form.organization_name.trim()) score += 20;
    if (form.workspace_name.trim()) score += 20;
    if (form.timezone.trim()) score += 15;
    if (form.default_language.trim()) score += 15;
    if (form.evidence_required) score += 10;
    if (form.approval_required) score += 10;
    if (form.enforce_role_permissions) score += 10;

    return score;
  }, [form]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setNotice(null);

      await updateSettings({
        organization_name: form.organization_name,
        workspace_name: form.workspace_name,
        timezone: form.timezone,
        default_language: form.default_language,
        task_auto_archive_days: Number(form.task_auto_archive_days),
        evidence_required: form.evidence_required,
        approval_required: form.approval_required,
        email_notifications: form.email_notifications,
        dashboard_alerts: form.dashboard_alerts,
        overdue_alerts: form.overdue_alerts,
        session_timeout_minutes: Number(form.session_timeout_minutes),
        enforce_role_permissions: form.enforce_role_permissions,
      });

      await reload();
      setNotice("Settings saved successfully.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<T extends keyof typeof form>(
    key: T,
    value: (typeof form)[T]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (isLoading) {
    return (
      <main className="space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">Settings</p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Loading workspace settings...
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Admin Settings
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Settings Workspace
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Configure NovaOps organization standards, outlet operation rules,
            notifications, and enterprise access behavior.
          </p>
        </div>

        <button
          form="settings-form"
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
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

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Setup Score"
          value={`${completionScore}%`}
          description="Workspace configuration readiness"
        />
        <MetricCard
          label="Timezone"
          value={form.timezone}
          description="Default operational reporting timezone"
        />
        <MetricCard
          label="Security"
          value={form.enforce_role_permissions ? "Enabled" : "Limited"}
          description="Role based access control"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <SectionCard title="Settings Menu">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  activeTab === tab.id
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium text-slate-900">{tab.label}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {tab.description}
                </div>
              </button>
            ))}
          </nav>
        </SectionCard>

        <form
          id="settings-form"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {activeTab === "organization" && (
            <SectionCard
              title="Organization Settings"
              description="Basic organization profile and regional defaults."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Organization Name
                  </span>

                  <input
                    value={form.organization_name}
                    onChange={(e) =>
                      updateField("organization_name", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Workspace Name</span>

                  <input
                    value={form.workspace_name}
                    onChange={(e) =>
                      updateField("workspace_name", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Timezone</span>

                  <select
                    value={form.timezone}
                    onChange={(e) =>
                      updateField("timezone", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
                  >
                    <option>Asia/Jakarta</option>
                    <option>Asia/Makassar</option>
                    <option>Asia/Jayapura</option>
                    <option>UTC</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">Language</span>

                  <select
                    value={form.default_language}
                    onChange={(e) =>
                      updateField("default_language", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
                  >
                    <option value="en">English</option>
                    <option value="id">Bahasa Indonesia</option>
                  </select>
                </label>
              </div>
            </SectionCard>
          )}

          {activeTab === "operations" && (
            <SectionCard
              title="Operations Settings"
              description="Enterprise operational defaults."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Auto Archive (days)
                  </span>

                  <input
                    type="number"
                    value={form.task_auto_archive_days}
                    onChange={(e) =>
                      updateField(
                        "task_auto_archive_days",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
                  />
                </label>

                <div className="space-y-4">
                  <ActionCard
                    title="Evidence Required"
                    description="Task cannot be completed without evidence."
                    action={
                      <input
                        type="checkbox"
                        checked={form.evidence_required}
                        onChange={(e) =>
                          updateField(
                            "evidence_required",
                            e.target.checked
                          )
                        }
                      />
                    }
                  />

                  <ActionCard
                    title="Approval Required"
                    description="Require supervisor approval."
                    action={
                      <input
                        type="checkbox"
                        checked={form.approval_required}
                        onChange={(e) =>
                          updateField(
                            "approval_required",
                            e.target.checked
                          )
                        }
                      />
                    }
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === "notifications" && (
            <SectionCard
              title="Notification Settings"
              description="Control operational notifications."
            >
              <div className="space-y-4">
                <ActionCard
                  title="Email Notifications"
                  description="Send operational emails."
                  action={
                    <input
                      type="checkbox"
                      checked={form.email_notifications}
                      onChange={(e) =>
                        updateField(
                          "email_notifications",
                          e.target.checked
                        )
                      }
                    />
                  }
                />

                <ActionCard
                  title="Dashboard Alerts"
                  description="Show alerts inside dashboard."
                  action={
                    <input
                      type="checkbox"
                      checked={form.dashboard_alerts}
                      onChange={(e) =>
                        updateField(
                          "dashboard_alerts",
                          e.target.checked
                        )
                      }
                    />
                  }
                />

                <ActionCard
                  title="Overdue Alerts"
                  description="Notify overdue operational tasks."
                  action={
                    <input
                      type="checkbox"
                      checked={form.overdue_alerts}
                      onChange={(e) =>
                        updateField(
                          "overdue_alerts",
                          e.target.checked
                        )
                      }
                    />
                  }
                />
              </div>
            </SectionCard>
          )}

          {activeTab === "security" && (
            <SectionCard
              title="Security Settings"
              description="Session and permission configuration."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">
                    Session Timeout (minutes)
                  </span>

                  <input
                    type="number"
                    value={form.session_timeout_minutes}
                    onChange={(e) =>
                      updateField(
                        "session_timeout_minutes",
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
                  />
                </label>

                <ActionCard
                  title="Role Permission Enforcement"
                  description="Strict enterprise RBAC."
                  action={
                    <input
                      type="checkbox"
                      checked={form.enforce_role_permissions}
                      onChange={(e) =>
                        updateField(
                          "enforce_role_permissions",
                          e.target.checked
                        )
                      }
                    />
                  }
                />
              </div>
            </SectionCard>
          )}
        </form>
      </div>
    </main>
  );
}