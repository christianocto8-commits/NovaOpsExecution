"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { changePassword, updateSettings } from "@/features/settings/settings-api";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { ActionCard } from "@/shared/ui/cards/action-card";
import { MetricCard } from "@/shared/ui/cards/metric-card";
import { SectionCard } from "@/shared/ui/cards/section-card";
import { Language, useLanguage } from "@/shared/i18n";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import {
  EnterpriseCheckbox,
  EnterpriseField,
  EnterpriseInput,
  EnterpriseSelect,
} from "@/shared/form";

type SettingsTab = "organization" | "operations" | "notifications" | "security";

const tabs: SettingsTab[] = ["organization", "operations", "notifications", "security"];

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

function OutletSettingsWorkspace() {
  const { language, setLanguage, t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function saveOutletSettings() {
    setNotice(null);

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
        setNotice(t("settings.passwordMismatch"));
        return;
      }

      try {
        setIsSavingPassword(true);
        await changePassword({
          current_password: currentPassword,
          new_password: newPassword,
        });
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Failed to update password.");
        return;
      } finally {
        setIsSavingPassword(false);
      }
    }

    setLanguage(language);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNotice(t("settings.outletSaved"));
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("settings.outletEyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("settings.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("settings.outletDescription")}</p>
        </div>

        <button
          type="button"
          onClick={() => void saveOutletSettings()}
          disabled={isSavingPassword}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSavingPassword ? t("common.saving") : t("common.saveSettings")}
        </button>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={t("common.language")}
          description={t("settings.outletLanguageDescription")}
        >
          <EnterpriseField label={t("common.language")}>
            <EnterpriseSelect
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value as Language);
                setNotice(null);
              }}
            >
              <option value="id">{t("common.indonesian")}</option>
              <option value="en">{t("common.english")}</option>
            </EnterpriseSelect>
          </EnterpriseField>
        </SectionCard>

        <SectionCard title={t("common.password")} description={t("settings.passwordDescription")}>
          <div className="space-y-4">
            <EnterpriseField label={t("common.currentPassword")}>
              <EnterpriseInput
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </EnterpriseField>

            <EnterpriseField label={t("common.newPassword")}>
              <EnterpriseInput
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </EnterpriseField>

            <EnterpriseField label={t("common.confirmNewPassword")}>
              <EnterpriseInput
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </EnterpriseField>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}

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
  const { setLanguage, t } = useLanguage();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const { settings, isLoading, error, reload } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>("organization");
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const formValues = useMemo(() => getSettingsFormValues(settings), [settings]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema) as never,
    values: formValues,
  });
  const languageRegister = register("default_language");

  const watchedForm = useWatch<SettingsFormValues>({ control });
  const form: SettingsFormValues = {
    ...formValues,
    ...watchedForm,
  };

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
      setLanguage((values.default_language === "id" ? "id" : "en") as Language);
      await reload();

      setNotice(t("settings.saved"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordNotice(null);

    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      setPasswordNotice(t("settings.passwordMismatch"));
      return;
    }

    try {
      setIsSavingPassword(true);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(t("settings.passwordUpdated"));
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (workspace.mode === "outlet") {
    return <OutletSettingsWorkspace />;
  }

  if (isLoading) {
    return (
      <main className="space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("settings.title")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("settings.loading")}</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("settings.adminEyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("settings.workspaceTitle")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t("settings.adminDescription")}</p>
        </div>

        <button
          form="settings-form"
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("common.saving") : t("common.saveSettings")}
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
        <MetricCard label={t("settings.setupScore")} value={`${completionScore}%`} />
        <MetricCard label={t("settings.timezone")} value={form.timezone ?? "-"} />
        <MetricCard
          label={t("settings.security")}
          value={form.enforce_role_permissions ? t("settings.enabled") : t("settings.limited")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <SectionCard title={t("settings.menu")}>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  activeTab === tab
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium text-slate-900">
                  {t(`settings.${tab === "security" ? "securityTab" : tab}`)}
                </div>
                <div className="mt-1 text-xs text-slate-500">{t(`settings.${tab}Description`)}</div>
              </button>
            ))}
          </nav>
        </SectionCard>

        <form id="settings-form" onSubmit={handleSubmit(handleSave as never)} className="space-y-6">
          {activeTab === "organization" ? (
            <SectionCard
              title={t("settings.organizationSettings")}
              description={t("settings.organizationSettingsDescription")}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <EnterpriseField
                  label={t("settings.organizationName")}
                  error={errors.organization_name?.message}
                >
                  <EnterpriseInput {...register("organization_name")} />
                </EnterpriseField>

                <EnterpriseField
                  label={t("settings.workspaceName")}
                  error={errors.workspace_name?.message}
                >
                  <EnterpriseInput {...register("workspace_name")} />
                </EnterpriseField>

                <EnterpriseField label={t("settings.timezone")} error={errors.timezone?.message}>
                  <EnterpriseSelect {...register("timezone")}>
                    <option value="Asia/Jakarta">Asia/Jakarta</option>
                    <option value="Asia/Makassar">Asia/Makassar</option>
                    <option value="Asia/Jayapura">Asia/Jayapura</option>
                    <option value="UTC">UTC</option>
                  </EnterpriseSelect>
                </EnterpriseField>

                <EnterpriseField
                  label={t("common.language")}
                  error={errors.default_language?.message}
                >
                  <EnterpriseSelect
                    {...languageRegister}
                    onChange={(event) => {
                      void languageRegister.onChange(event);
                      setLanguage(event.target.value as Language);
                    }}
                  >
                    <option value="en">{t("common.english")}</option>
                    <option value="id">{t("common.indonesian")}</option>
                  </EnterpriseSelect>
                </EnterpriseField>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "operations" ? (
            <SectionCard
              title={t("settings.operationsSettings")}
              description={t("settings.operationsSettingsDescription")}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <EnterpriseField
                  label={t("settings.autoArchiveDays")}
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
                    title={t("settings.evidenceRequired")}
                    description={t("settings.evidenceRequiredDescription")}
                    action={<EnterpriseCheckbox {...register("evidence_required")} />}
                  />

                  <ActionCard
                    title={t("settings.approvalRequired")}
                    description={t("settings.approvalRequiredDescription")}
                    action={<EnterpriseCheckbox {...register("approval_required")} />}
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "notifications" ? (
            <SectionCard
              title={t("settings.notificationSettings")}
              description={t("settings.notificationSettingsDescription")}
            >
              <div className="space-y-4">
                <ActionCard
                  title={t("settings.emailNotifications")}
                  description={t("settings.emailNotificationsDescription")}
                  action={<EnterpriseCheckbox {...register("email_notifications")} />}
                />

                <ActionCard
                  title={t("settings.dashboardAlerts")}
                  description={t("settings.dashboardAlertsDescription")}
                  action={<EnterpriseCheckbox {...register("dashboard_alerts")} />}
                />

                <ActionCard
                  title={t("settings.overdueAlerts")}
                  description={t("settings.overdueAlertsDescription")}
                  action={<EnterpriseCheckbox {...register("overdue_alerts")} />}
                />
              </div>
            </SectionCard>
          ) : null}

          {activeTab === "security" ? (
            <SectionCard
              title={t("settings.securitySettings")}
              description={t("settings.securityDescription")}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <EnterpriseField
                  label={t("settings.sessionTimeout")}
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
                  title={t("settings.rolePermissionEnforcement")}
                  description={t("settings.rolePermissionEnforcementDescription")}
                  action={<EnterpriseCheckbox {...register("enforce_role_permissions")} />}
                />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-950">{t("common.password")}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("settings.passwordDescription")}
                  </p>
                </div>

                {passwordNotice ? (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                    {passwordNotice}
                  </div>
                ) : null}

                <div className="grid gap-5 md:grid-cols-3">
                  <EnterpriseField label={t("common.currentPassword")}>
                    <EnterpriseInput
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </EnterpriseField>

                  <EnterpriseField label={t("common.newPassword")}>
                    <EnterpriseInput
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </EnterpriseField>

                  <EnterpriseField label={t("common.confirmNewPassword")}>
                    <EnterpriseInput
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </EnterpriseField>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePasswordChange()}
                  disabled={isSavingPassword}
                  className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingPassword ? t("common.saving") : t("common.savePassword")}
                </button>
              </div>
            </SectionCard>
          ) : null}
        </form>
      </div>
    </main>
  );
}
