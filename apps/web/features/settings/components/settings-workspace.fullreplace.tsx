"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateSettings } from "@/features/settings/settings-api";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { ActionCard } from "@/shared/ui/cards/action-card";
import { MetricCard } from "@/shared/ui/cards/metric-card";
import { SectionCard } from "@/shared/ui/cards/section-card";
import {
  EnterpriseCheckbox,
  EnterpriseField,
  EnterpriseInput,
  EnterpriseSelect,
} from "@/shared/form";

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

const settingsSchema = z.object({
  organization_name: z.string(),
  workspace_name: z.string(),
  timezone: z.string().min(1, "Timezone is required"),
  default_language: z.string().min(1, "Language is required"),
  task_auto_archive_days: z.coerce.number().min(1),
  evidence_required: z.boolean(),
  approval_required: z.boolean(),
  email_notifications: z.boolean(),
  dashboard_alerts: z.boolean(),
  overdue_alerts: z.boolean(),
  session_timeout_minutes: z.coerce.number().min(15),
  enforce_role_permissions: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

function getSettingsFormValues(
  settings: Partial<SettingsFormValues> | null | undefined
): SettingsFormValues {
  return {
    organization_name: settings?.organization_name ?? "",
    workspace_name: settings?.workspace_name ?? "",
    timezone: settings?.timezone ?? "Asia/Jakarta",
    default_language: settings?.default_language ?? "en",
    task_auto_archive_days: Number(settings?.task_auto_archive_days ?? 30),
    evidence_required: Boolean(settings?.evidence_required ?? true),
    approval_required: Boolean(settings?.approval_required ?? true),
    email_notifications: Boolean(settings?.email_notifications ?? true),
    dashboard_alerts: Boolean(settings?.dashboard_alerts ?? true),
    overdue_alerts: Boolean(settings?.overdue_alerts ?? true),
    session_timeout_minutes: Number(settings?.session_timeout_minutes ?? 120),
    enforce_role_permissions: Boolean(settings?.enforce_role_permissions ?? true),
  };
}

export function SettingsWorkspace() {
  const { settings, isLoading, error, reload } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("organization");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const formValues = useMemo(
    () => getSettingsFormValues(settings),
    [settings]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: formValues,
  });

  const form = useWatch({
    control,
  }) as SettingsFormValues;

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

  async function handleSave(values: SettingsFormValues) {
    try {
      setIsSaving(true);
      setNotice(null);

      await updateSettings(values);
      await reload();

      setNotice("Settings saved successfully.");
    } finally {
      setIsSaving(false);
    }
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
          onSubmit={handleSubmit(handleSave)}
          className="space-y-6"
        >
          {activeTab === "organization" ? (
            <SectionCard
              title="Organization Settings"
              description="Basic organization profile and regional defaults."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <EnterpriseField
                  label="Organization Name"
                  error={errors.organization_name?.message}
                >
                  <EnterpriseInput {...register("organization_name")} />
                </EnterpriseField>

                <EnterpriseField
                  label="Workspace Name"
                  error={errors.workspace_name?.message}
                >
                  <EnterpriseInput {...register("workspace_name")} />
                </EnterpriseField>

                <EnterpriseField
                  label="Timezone"
                  error={errors.timezone?.message}
                >
                  <EnterpriseSelect {...register("timezone")}>
                    <option value="Asia/Jakarta">Asia/Jakarta</option>
                    <option value="Asia/Makassar">Asia/Makassar</option>
                    <option value="Asia/Jayapura">Asia/Jayapura</option>
                    <option value="UTC">UTC</option>
                  </EnterpriseSelect>
                </EnterpriseField>

                <EnterpriseField
                  label="Language"
                  error={errors.default_language?.message}
                >
                  <EnterpriseSelect {...register("default_language")}>
                    <option value="en">English</option>
                    <option value="id">Bahasa Indonesia</option>
                  </EnterpriseSelect>
                </EnterpriseField>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "operations" ? (
            <SectionCard
              title="Operations Settings"
              description="Enterprise operational defaults."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <EnterpriseField
                  label="Auto Archive (days)"
                  error={errors.task_auto_archive_days?.message}
                >
                  <EnterpriseInput
                    type="number"
                    {...register("task_auto_archive_days", {
                      valueAsNumber: true,
                    })}
                  />
                </EnterpriseField>

                <div className="space-y-4">
                  <ActionCard
                    title="Evidence Required"
                    description="Task cannot be completed without evidence."
                    action={
                      <EnterpriseCheckbox
                        {...register("evidence_required")}
                      />
                    }
                  />

                  <ActionCard
                    title="Approval Required"
                    description="Require supervisor approval."
                    action={
                      <EnterpriseCheckbox
                        {...register("approval_required")}
                      />
                    }
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "notifications" ? (
            <SectionCard
              title="Notification Settings"
              description="Control operational notifications."
            >
              <div className="space-y-4">
                <ActionCard
                  title="Email Notifications"
                  description="Send operational emails."
                  action={
                    <EnterpriseCheckbox
                      {...register("email_notifications")}
                    />
                  }
                />

                <ActionCard
                  title="Dashboard Alerts"
                  description="Show alerts inside dashboard."
                  action={
                    <EnterpriseCheckbox {...register("dashboard_alerts")} />
                  }
                />

                <ActionCard
                  title="Overdue Alerts"
                  description="Notify overdue operational tasks."
                  action={
                    <EnterpriseCheckbox {...register("overdue_alerts")} />
                  }
                />
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "security" ? (
            <SectionCard
              title="Security Settings"
              description="Session and permission configuration."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <EnterpriseField
                  label="Session Timeout (minutes)"
                  error={errors.session_timeout_minutes?.message}
                >
                  <EnterpriseInput
                    type="number"
                    {...register("session_timeout_minutes", {
                      valueAsNumber: true,
                    })}
                  />
                </EnterpriseField>

                <ActionCard
                  title="Role Permission Enforcement"
                  description="Strict enterprise RBAC."
                  action={
                    <EnterpriseCheckbox
                      {...register("enforce_role_permissions")}
                    />
                  }
                />
              </div>
            </SectionCard>
          ) : null}
        </form>
      </div>
    </main>
  );
}
