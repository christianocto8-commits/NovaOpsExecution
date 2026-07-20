"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bell,
  Building2,
  CheckSquare,
  FileText,
  Shield,
  Users,
} from "lucide-react";

import { changePassword, type SettingsResponse } from "@/features/settings/settings-api";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { EnterpriseCheckbox, EnterpriseField, EnterpriseInput, EnterpriseSelect } from "@/shared/form";
import { Language, useLanguage } from "@/shared/i18n";
import { getServerWorkspaceSnapshot, getWorkspaceSnapshot, subscribeWorkspace } from "@/shared/navigation";
import { ActionCard } from "@/shared/ui/cards/action-card";
import { MetricCard } from "@/shared/ui/cards/metric-card";
import { SectionCard } from "@/shared/ui/cards/section-card";

type OwnerAdminState = {
  organization_name: string;
  workspace_name: string;
  timezone: string;
  default_language: string;
  task_auto_archive_days: number;
  evidence_required: boolean;
  approval_required: boolean;
  email_notifications: boolean;
  dashboard_alerts: boolean;
  overdue_alerts: boolean;
  session_timeout_minutes: number;
  enforce_role_permissions: boolean;
  default_task_due_time: string;
  daily_reminder_window: string;
  pass_threshold: number;
  corrective_action_sla_hours: number;
  photo_required_by_default: boolean;
  max_upload_mb: number;
  timestamp_watermark: boolean;
  gps_watermark: boolean;
  outlet_grouping: string;
  default_user_role: string;
  digest_frequency: string;
  two_factor_required: boolean;
  password_rotation_days: number;
  webhook_enabled: boolean;
  auto_workflow_on_checklist_fail: boolean;
  checklist_fail_workflow_code: string;
  auto_workflow_on_task_completed: boolean;
  task_completed_workflow_code: string;
};

const defaults: OwnerAdminState = {
  organization_name: "NovaOps",
  workspace_name: "Main Workspace",
  timezone: "Asia/Jakarta",
  default_language: "id",
  task_auto_archive_days: 30,
  evidence_required: true,
  approval_required: false,
  email_notifications: true,
  dashboard_alerts: true,
  overdue_alerts: true,
  session_timeout_minutes: 120,
  enforce_role_permissions: true,
  default_task_due_time: "09:00",
  daily_reminder_window: "06:00",
  pass_threshold: 85,
  corrective_action_sla_hours: 24,
  photo_required_by_default: true,
  max_upload_mb: 10,
  timestamp_watermark: true,
  gps_watermark: true,
  outlet_grouping: "region",
  default_user_role: "outlet_manager",
  digest_frequency: "daily",
  two_factor_required: false,
  password_rotation_days: 90,
  webhook_enabled: false,
  auto_workflow_on_checklist_fail: false,
  checklist_fail_workflow_code: "",
  auto_workflow_on_task_completed: false,
  task_completed_workflow_code: "",
};

function buildOwnerAdminState(settings?: Partial<SettingsResponse> | null): OwnerAdminState {
  return {
    organization_name: settings?.organization_name ?? defaults.organization_name,
    workspace_name: settings?.workspace_name ?? defaults.workspace_name,
    timezone: settings?.timezone ?? defaults.timezone,
    default_language: settings?.default_language ?? defaults.default_language,
    task_auto_archive_days: Number(settings?.task_auto_archive_days ?? defaults.task_auto_archive_days),
    evidence_required: Boolean(settings?.evidence_required ?? defaults.evidence_required),
    approval_required: Boolean(settings?.approval_required ?? defaults.approval_required),
    email_notifications: Boolean(settings?.email_notifications ?? defaults.email_notifications),
    dashboard_alerts: Boolean(settings?.dashboard_alerts ?? defaults.dashboard_alerts),
    overdue_alerts: Boolean(settings?.overdue_alerts ?? defaults.overdue_alerts),
    session_timeout_minutes: Number(settings?.session_timeout_minutes ?? defaults.session_timeout_minutes),
    enforce_role_permissions: Boolean(settings?.enforce_role_permissions ?? defaults.enforce_role_permissions),
    default_task_due_time: settings?.default_task_due_time ?? defaults.default_task_due_time,
    daily_reminder_window: settings?.daily_reminder_window ?? defaults.daily_reminder_window,
    pass_threshold: Number(settings?.pass_threshold ?? defaults.pass_threshold),
    corrective_action_sla_hours: Number(settings?.corrective_action_sla_hours ?? defaults.corrective_action_sla_hours),
    photo_required_by_default: Boolean(
      settings?.photo_required_by_default ?? defaults.photo_required_by_default
    ),
    max_upload_mb: Number(settings?.max_upload_mb ?? defaults.max_upload_mb),
    timestamp_watermark: Boolean(settings?.timestamp_watermark ?? defaults.timestamp_watermark),
    gps_watermark: Boolean(settings?.gps_watermark ?? defaults.gps_watermark),
    outlet_grouping: settings?.outlet_grouping ?? defaults.outlet_grouping,
    default_user_role: settings?.default_user_role ?? defaults.default_user_role,
    digest_frequency: settings?.digest_frequency ?? defaults.digest_frequency,
    two_factor_required: Boolean(settings?.two_factor_required ?? defaults.two_factor_required),
    password_rotation_days: Number(settings?.password_rotation_days ?? defaults.password_rotation_days),
    webhook_enabled: Boolean(settings?.webhook_enabled ?? defaults.webhook_enabled),
    auto_workflow_on_checklist_fail: Boolean(
      settings?.auto_workflow_on_checklist_fail ?? defaults.auto_workflow_on_checklist_fail
    ),
    checklist_fail_workflow_code:
      settings?.checklist_fail_workflow_code ?? defaults.checklist_fail_workflow_code,
    auto_workflow_on_task_completed: Boolean(
      settings?.auto_workflow_on_task_completed ?? defaults.auto_workflow_on_task_completed
    ),
    task_completed_workflow_code:
      settings?.task_completed_workflow_code ?? defaults.task_completed_workflow_code,
  };
}

function RoleAccessSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 px-4 py-3">
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PasswordPanel({
  title,
  description,
  onNotice,
}: {
  title: string;
  description: string;
  onNotice: (message: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      onNotice("Password baru belum cocok atau password saat ini belum diisi.");
      return;
    }

    try {
      setIsSaving(true);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onNotice("Password berhasil diperbarui.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal memperbarui password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard title={title}>
      <p className="mb-5 text-sm text-slate-500">{description}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <EnterpriseField label="Current password">
          <EnterpriseInput
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </EnterpriseField>
        <EnterpriseField label="New password">
          <EnterpriseInput
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </EnterpriseField>
        <EnterpriseField label="Confirm password">
          <EnterpriseInput
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </EnterpriseField>
      </div>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving}
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving ? "Menyimpan..." : "Simpan password"}
      </button>
    </SectionCard>
  );
}

function OutletSettingsWorkspace({
  settings,
  notice,
  setNotice,
  outletName,
}: {
  settings?: SettingsResponse;
  notice: string | null;
  setNotice: (message: string | null) => void;
  outletName?: string;
}) {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Outlet Workspace</p>
        <h1 className="text-2xl font-semibold text-slate-950">Outlet Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pengaturan outlet fokus ke akun, keamanan, dan ringkasan aturan kerja untuk {outletName ?? "outlet ini"}.
        </p>
      </div>
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Role" value="Outlet" />
        <MetricCard label="Submit" value="Auto complete" />
        <MetricCard label="Evidence" value={settings?.evidence_required ? "Required" : "Optional"} />
        <MetricCard label="Upload" value={`${settings?.max_upload_mb ?? defaults.max_upload_mb} MB`} />
      </div>
      <RoleAccessSection
        title="Akses Outlet"
        items={[
          "Mengerjakan task yang dipublish ke outlet.",
          "Menyimpan progres task ke draft dan melanjutkannya nanti.",
          "Upload evidence, foto, dan catatan operasional.",
          "Melihat history task outlet sendiri.",
        ]}
      />
      <RoleAccessSection
        title="Batas Akses Outlet"
        items={[
          "Tidak bisa membuat atau menghapus task global.",
          "Tidak bisa mengelola user, outlet, atau akun lain.",
          "Tidak bisa mengubah pengaturan organisasi, role, dan compliance global.",
          "Tidak bisa melihat laporan seluruh area atau seluruh perusahaan.",
        ]}
      />
      <SectionCard title="Ringkasan Kebijakan Kerja">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard title="Bukti foto" description="Ketentuan bukti pada task outlet." action={<span className="text-sm font-semibold text-slate-900">{settings?.photo_required_by_default ? "Wajib" : "Opsional"}</span>} />
          <ActionCard title="Reminder task" description="Alarm keterlambatan untuk outlet." action={<span className="text-sm font-semibold text-slate-900">{settings?.overdue_alerts ? "Aktif" : "Mati"}</span>} />
          <ActionCard title="Bahasa workspace" description="Bahasa default workspace saat ini." action={<span className="text-sm font-semibold text-slate-900">{settings?.default_language === "en" ? "English" : "Indonesia"}</span>} />
        </div>
      </SectionCard>
      <PasswordPanel
        title="Keamanan Akun"
        description="Outlet hanya dapat mengubah keamanan akun sendiri, tanpa mengubah aturan organisasi."
        onNotice={(message) => setNotice(message)}
      />
    </main>
  );
}

function AreaManagerSettingsWorkspace({
  settings,
  notice,
  setNotice,
}: {
  settings?: SettingsResponse;
  notice: string | null;
  setNotice: (message: string | null) => void;
}) {
  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">Area Operations</p>
        <h1 className="text-2xl font-semibold text-slate-950">Area Manager Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Area manager dapat memantau outlet, task, draft, dan laporan area tanpa masuk ke pengaturan inti organisasi.
        </p>
      </div>
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Role" value="Area Manager" />
        <MetricCard label="Digest" value={settings?.digest_frequency ?? defaults.digest_frequency} />
        <MetricCard label="SLA temuan" value={`${settings?.corrective_action_sla_hours ?? defaults.corrective_action_sla_hours} jam`} />
        <MetricCard label="Pass score" value={`${settings?.pass_threshold ?? defaults.pass_threshold}%`} />
      </div>
      <RoleAccessSection
        title="Akses Area Manager"
        items={[
          "Melihat outlet yang berada di area tanggung jawabnya.",
          "Memantau task, draft, compliance, dan corrective action area.",
          "Melihat laporan operasional area dan notifikasi keterlambatan.",
          "Membantu follow up outlet tanpa mengubah struktur organisasi.",
        ]}
      />
      <RoleAccessSection
        title="Batas Akses Area Manager"
        items={[
          "Tidak bisa mengelola owner/admin account.",
          "Tidak bisa mengubah setting organisasi, integrasi, dan policy keamanan global.",
          "Tidak bisa membuat outlet baru atau menghapus outlet dari organisasi.",
          "Tidak bisa mengambil full control seperti owner/admin.",
        ]}
      />
      <SectionCard title="Ringkasan Operasional Area">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard title="Alert dashboard" description="Status alert untuk area manager." action={<span className="text-sm font-semibold text-slate-900">{settings?.dashboard_alerts ? "Aktif" : "Mati"}</span>} />
          <ActionCard title="Overdue alerts" description="Peringatan keterlambatan task di area." action={<span className="text-sm font-semibold text-slate-900">{settings?.overdue_alerts ? "Aktif" : "Mati"}</span>} />
          <ActionCard title="Grouping outlet" description="Pengelompokan outlet di dashboard." action={<span className="text-sm font-semibold text-slate-900">{settings?.outlet_grouping ?? defaults.outlet_grouping}</span>} />
        </div>
      </SectionCard>
      <PasswordPanel
        title="Keamanan Akun"
        description="Area manager dapat mengubah password akun sendiri, namun tidak dapat mengubah policy keamanan global."
        onNotice={(message) => setNotice(message)}
      />
    </main>
  );
}

export function SettingsWorkspace() {
  const { setLanguage } = useLanguage();
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspaceSnapshot, getServerWorkspaceSnapshot);
  const { settings, isLoading, error, reload, saveSettings, saveError, isSaving } = useSettings();
  const [state, setState] = useState<OwnerAdminState>(defaults);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setState(buildOwnerAdminState(settings));
  }, [settings]);

  const summaryCards = useMemo(
    () => [
      { label: "Timezone", value: state.timezone },
      { label: "Pass score", value: `${state.pass_threshold}%` },
      { label: "Photo evidence", value: state.photo_required_by_default ? "Wajib" : "Opsional" },
      { label: "Evidence", value: state.evidence_required ? "Required" : "Optional" },
      { label: "Security", value: state.enforce_role_permissions ? "Guarded" : "Basic" },
    ],
    [state]
  );

  function update<K extends keyof OwnerAdminState>(key: K, value: OwnerAdminState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    try {
      setNotice(null);
      await saveSettings(state);
      setLanguage((state.default_language === "en" ? "en" : "id") as Language);
      await reload();
      setNotice("Pengaturan admin berhasil disimpan.");
    } catch (saveFailure) {
      setNotice(
        saveFailure instanceof Error ? saveFailure.message : "Gagal menyimpan pengaturan."
      );
    }
  }

  if (isLoading) {
    return (
      <main className="p-6">
        <p className="text-sm text-emerald-700">Memuat settings...</p>
      </main>
    );
  }

  if (workspace.mode === "outlet") {
    return (
      <OutletSettingsWorkspace
        settings={settings}
        notice={notice}
        setNotice={setNotice}
        outletName={workspace.outletName}
      />
    );
  }

  if (workspace.mode === "area") {
    return (
      <AreaManagerSettingsWorkspace
        settings={settings}
        notice={notice}
        setNotice={setNotice}
      />
    );
  }

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Owner & Admin Control</p>
          <h1 className="text-2xl font-semibold text-slate-950">Workspace Settings</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Owner/admin memegang full access untuk organisasi, task publishing, governance, dan keamanan workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSaving ? "Menyimpan..." : "Simpan pengaturan"}
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {saveError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{saveError}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="General Workspace">
          <div className="grid gap-5 md:grid-cols-2">
            <EnterpriseField label="Organization">
              <EnterpriseInput
                value={state.organization_name}
                onChange={(event) => update("organization_name", event.target.value)}
              />
            </EnterpriseField>
            <EnterpriseField label="Workspace">
              <EnterpriseInput
                value={state.workspace_name}
                onChange={(event) => update("workspace_name", event.target.value)}
              />
            </EnterpriseField>
            <EnterpriseField label="Timezone">
              <EnterpriseSelect
                value={state.timezone}
                onChange={(event) => update("timezone", event.target.value)}
              >
                <option value="Asia/Jakarta">Asia/Jakarta</option>
                <option value="Asia/Makassar">Asia/Makassar</option>
                <option value="Asia/Jayapura">Asia/Jayapura</option>
                <option value="UTC">UTC</option>
              </EnterpriseSelect>
            </EnterpriseField>
            <EnterpriseField label="Language">
              <EnterpriseSelect
                value={state.default_language}
                onChange={(event) => update("default_language", event.target.value)}
              >
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </EnterpriseSelect>
            </EnterpriseField>
            <EnterpriseField label="Outlet grouping">
              <EnterpriseSelect
                value={state.outlet_grouping}
                onChange={(event) => update("outlet_grouping", event.target.value)}
              >
                <option value="region">Region</option>
                <option value="city">City</option>
                <option value="brand">Brand</option>
              </EnterpriseSelect>
            </EnterpriseField>
            <EnterpriseField label="Default user role">
              <EnterpriseSelect
                value={state.default_user_role}
                onChange={(event) => update("default_user_role", event.target.value)}
              >
                <option value="outlet_manager">Outlet Manager</option>
                <option value="staff">Staff</option>
                <option value="area_manager">Area Manager</option>
                <option value="admin">Admin</option>
              </EnterpriseSelect>
            </EnterpriseField>
          </div>
        </SectionCard>

        <SectionCard title="Task & SOP Policy">
          <div className="grid gap-5 md:grid-cols-2">
            <EnterpriseField label="Auto archive days">
              <EnterpriseInput
                type="number"
                value={state.task_auto_archive_days}
                onChange={(event) => update("task_auto_archive_days", Number(event.target.value || 0))}
              />
            </EnterpriseField>
            <EnterpriseField label="Default due time">
              <EnterpriseInput
                type="time"
                value={state.default_task_due_time}
                onChange={(event) => update("default_task_due_time", event.target.value)}
              />
            </EnterpriseField>
            <EnterpriseField label="Reminder window">
              <EnterpriseInput
                type="time"
                value={state.daily_reminder_window}
                onChange={(event) => update("daily_reminder_window", event.target.value)}
              />
            </EnterpriseField>
            <EnterpriseField label="Pass threshold">
              <EnterpriseInput
                type="number"
                value={state.pass_threshold}
                onChange={(event) => update("pass_threshold", Number(event.target.value || 0))}
              />
            </EnterpriseField>
            <EnterpriseField label="Corrective action SLA (hours)">
              <EnterpriseInput
                type="number"
                value={state.corrective_action_sla_hours}
                onChange={(event) =>
                  update("corrective_action_sla_hours", Number(event.target.value || 0))
                }
              />
            </EnterpriseField>
            <EnterpriseField label="Max upload (MB)">
              <EnterpriseInput
                type="number"
                value={state.max_upload_mb}
                onChange={(event) => update("max_upload_mb", Number(event.target.value || 0))}
              />
            </EnterpriseField>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Execution Controls">
          <div className="space-y-4">
            <ActionCard title="Evidence required" description="Task wajib membawa evidence." action={<EnterpriseCheckbox checked={state.evidence_required} onChange={(event) => update("evidence_required", event.target.checked)} />} />
            <ActionCard title="Photo required by default" description="Submit task outlet wajib sertakan bukti foto." action={<EnterpriseCheckbox checked={state.photo_required_by_default} onChange={(event) => update("photo_required_by_default", event.target.checked)} />} />
            <ActionCard title="Timestamp watermark" description="Tambahkan cap waktu pada foto evidence sebelum upload." action={<EnterpriseCheckbox checked={state.timestamp_watermark} onChange={(event) => update("timestamp_watermark", event.target.checked)} />} />
            <ActionCard title="GPS on evidence" description="Simpan koordinat GPS pada metadata evidence (permission browser diperlukan)." action={<EnterpriseCheckbox checked={state.gps_watermark} onChange={(event) => update("gps_watermark", event.target.checked)} />} />
            <ActionCard title="Enforce role permissions" description="Beda akses owner, area manager, dan outlet tetap dijaga." action={<EnterpriseCheckbox checked={state.enforce_role_permissions} onChange={(event) => update("enforce_role_permissions", event.target.checked)} />} />
          </div>
        </SectionCard>

        <SectionCard title="Notifications">
          <div className="space-y-4">
            <ActionCard title="Dashboard alerts" description="Tampilkan alert operasional di dashboard." action={<EnterpriseCheckbox checked={state.dashboard_alerts} onChange={(event) => update("dashboard_alerts", event.target.checked)} />} />
            <ActionCard title="Overdue alerts" description="Peringatan untuk task yang melewati due time." action={<EnterpriseCheckbox checked={state.overdue_alerts} onChange={(event) => update("overdue_alerts", event.target.checked)} />} />
            <ActionCard title="Email notifications" description="Kirim email operasional untuk checklist gagal, overdue, dan due soon." action={<EnterpriseCheckbox checked={state.email_notifications} onChange={(event) => update("email_notifications", event.target.checked)} />} />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Email membutuhkan konfigurasi SMTP di server (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Integrations & Automation">
          <div className="space-y-4">
            <ActionCard
              title="Webhook delivery"
              description="Kirim event task/checklist ke endpoint HTTP eksternal."
              action={
                <EnterpriseCheckbox
                  checked={state.webhook_enabled}
                  onChange={(event) => update("webhook_enabled", event.target.checked)}
                />
              }
            />
            <ActionCard
              title="Auto workflow on checklist fail"
              description="Mulai workflow instance otomatis saat checklist gagal."
              action={
                <EnterpriseCheckbox
                  checked={state.auto_workflow_on_checklist_fail}
                  onChange={(event) =>
                    update("auto_workflow_on_checklist_fail", event.target.checked)
                  }
                />
              }
            />
            <EnterpriseField label="Checklist fail workflow code">
              <EnterpriseInput
                value={state.checklist_fail_workflow_code}
                onChange={(event) => update("checklist_fail_workflow_code", event.target.value)}
                placeholder="checklist-fail-review"
              />
            </EnterpriseField>
            <ActionCard
              title="Auto workflow on task completed"
              description="Mulai workflow instance otomatis saat task selesai."
              action={
                <EnterpriseCheckbox
                  checked={state.auto_workflow_on_task_completed}
                  onChange={(event) =>
                    update("auto_workflow_on_task_completed", event.target.checked)
                  }
                />
              }
            />
            <EnterpriseField label="Task completed workflow code">
              <EnterpriseInput
                value={state.task_completed_workflow_code}
                onChange={(event) => update("task_completed_workflow_code", event.target.value)}
                placeholder="task-completion-review"
              />
            </EnterpriseField>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Kelola endpoint webhook di halaman Webhooks. Workflow code harus sesuai definisi yang
            sudah dipublish di workflow engine.
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Role Guide">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Shield className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div>
                <p className="font-medium text-slate-900">Owner/Admin</p>
                <p>Full akses untuk outlet, user, task publishing, settings, dan governance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Users className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div>
                <p className="font-medium text-slate-900">Area Manager</p>
                <p>Fokus monitoring area, outlet, draft, compliance, dan report area.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <CheckSquare className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div>
                <p className="font-medium text-slate-900">Outlet</p>
                <p>Fokus eksekusi task, draft, evidence, dan history outlet sendiri.</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="What Owner/Admin Can Change">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Building2 className="mt-0.5 h-4 w-4 text-emerald-700" />
              <span>Pengaturan organisasi, outlet grouping, dan workspace default.</span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <FileText className="mt-0.5 h-4 w-4 text-emerald-700" />
              <span>Aturan task, SOP, evidence, approval, dan standar compliance.</span>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <Bell className="mt-0.5 h-4 w-4 text-emerald-700" />
              <span>Notifikasi, security, dan policy akses seluruh workspace.</span>
            </div>
          </div>
        </SectionCard>

        <PasswordPanel
          title="Security Password"
          description="Owner/admin tetap bisa mengganti password dari halaman ini."
          onNotice={(message) => setNotice(message)}
        />
      </div>
    </main>
  );
}
