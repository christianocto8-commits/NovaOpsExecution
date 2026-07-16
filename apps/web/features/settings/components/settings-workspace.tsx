"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Bell, Building2, Cable, CheckSquare, FileText, History, Shield, Users } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { changePassword, type SettingsResponse } from "@/features/settings/settings-api";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { EnterpriseCheckbox, EnterpriseField, EnterpriseInput, EnterpriseSelect } from "@/shared/form";
import { Language, useLanguage } from "@/shared/i18n";
import { getServerWorkspaceSnapshot, getWorkspaceSnapshot, subscribeWorkspace } from "@/shared/navigation";
import { ActionCard } from "@/shared/ui/cards/action-card";
import { MetricCard } from "@/shared/ui/cards/metric-card";
import { SectionCard } from "@/shared/ui/cards/section-card";

type SettingsTab = "general" | "outlets" | "users" | "tasks" | "forms" | "approvals" | "notifications" | "compliance" | "evidence" | "audit" | "integrations" | "security";

type AdminPrefs = {
  dateFormat: string; currency: string; dashboardLanding: string; outletGrouping: string; operatingHoursPolicy: string;
  outletManagerRequired: boolean; outletTemplateAutoAssign: boolean; defaultUserRole: string; inviteApprovalRequired: boolean; managerCanReassignTasks: boolean;
  defaultTaskDueTime: string; dailyReminderWindow: string; escalationAfterHours: number; recurringPublishMode: string;
  formCategoryMode: string; templateVersionLock: boolean; noteRequiredByDefault: boolean; signatureRequiredByDefault: boolean;
  reopenSubmissions: boolean; lockEditsAfterSubmit: boolean; autoCorrectiveAction: boolean;
  digestFrequency: string; scheduledReportAudience: string; passThreshold: number; criticalEscalation: boolean; correctiveActionSlaHours: number;
  photoRequiredByDefault: boolean; maxUploadMb: number; timestampWatermark: boolean; gpsWatermark: boolean;
  auditRetentionDays: number; loginHistoryVisible: boolean; templateHistoryVisible: boolean;
  exportFormat: string; webhookEnabled: boolean; apiStatusMode: string; twoFactorRequired: boolean; passwordRotationDays: number;
};

type FormValues = {
  organization_name: string; workspace_name: string; timezone: string; default_language: string; task_auto_archive_days: number;
  evidence_required: boolean; approval_required: boolean; email_notifications: boolean; dashboard_alerts: boolean; overdue_alerts: boolean;
  session_timeout_minutes: number; enforce_role_permissions: boolean;
};

const schema = z.object({
  organization_name: z.string(), workspace_name: z.string(), timezone: z.string().min(1), default_language: z.string().min(1),
  task_auto_archive_days: z.coerce.number().min(1), evidence_required: z.boolean(), approval_required: z.boolean(), email_notifications: z.boolean(),
  dashboard_alerts: z.boolean(), overdue_alerts: z.boolean(), session_timeout_minutes: z.coerce.number().min(15), enforce_role_permissions: z.boolean(),
});

const tabs: Array<{ id: SettingsTab; title: string; description: string; icon: typeof Building2 }> = [
  { id: "general", title: "General", description: "Brand, bahasa, zona waktu.", icon: Building2 },
  { id: "outlets", title: "Outlets", description: "Grouping dan outlet policy.", icon: Building2 },
  { id: "users", title: "Users & Roles", description: "Role default dan approval user.", icon: Users },
  { id: "tasks", title: "Tasks & SOP", description: "Due time dan publish rule.", icon: CheckSquare },
  { id: "forms", title: "Forms", description: "Kategori dan aturan template.", icon: FileText },
  { id: "approvals", title: "Approvals", description: "Review dan corrective action.", icon: Shield },
  { id: "notifications", title: "Notifications", description: "Alert dan digest.", icon: Bell },
  { id: "compliance", title: "Compliance", description: "Threshold dan SLA.", icon: Shield },
  { id: "evidence", title: "Evidence", description: "Photo proof dan upload.", icon: FileText },
  { id: "audit", title: "Audit Log", description: "Retensi dan histori.", icon: History },
  { id: "integrations", title: "Integrations", description: "Webhook dan export.", icon: Cable },
  { id: "security", title: "Security", description: "Session, role, 2FA.", icon: Shield },
];

const prefDefaults: AdminPrefs = {
  dateFormat: "dd/MM/yyyy", currency: "IDR", dashboardLanding: "dashboard", outletGrouping: "region", operatingHoursPolicy: "inherit-brand",
  outletManagerRequired: true, outletTemplateAutoAssign: true, defaultUserRole: "outlet_manager", inviteApprovalRequired: true, managerCanReassignTasks: true,
  defaultTaskDueTime: "09:00", dailyReminderWindow: "06:00", escalationAfterHours: 4, recurringPublishMode: "auto",
  formCategoryMode: "operational", templateVersionLock: true, noteRequiredByDefault: true, signatureRequiredByDefault: false,
  reopenSubmissions: true, lockEditsAfterSubmit: true, autoCorrectiveAction: true,
  digestFrequency: "daily", scheduledReportAudience: "owner-and-admin", passThreshold: 85, criticalEscalation: true, correctiveActionSlaHours: 24,
  photoRequiredByDefault: true, maxUploadMb: 10, timestampWatermark: true, gpsWatermark: false,
  auditRetentionDays: 180, loginHistoryVisible: true, templateHistoryVisible: true,
  exportFormat: "xlsx", webhookEnabled: false, apiStatusMode: "connected", twoFactorRequired: false, passwordRotationDays: 90,
};

function mapPrefs(settings?: Partial<SettingsResponse> | null): AdminPrefs {
  return {
    dateFormat: settings?.date_format ?? prefDefaults.dateFormat, currency: settings?.currency ?? prefDefaults.currency,
    dashboardLanding: settings?.dashboard_landing ?? prefDefaults.dashboardLanding, outletGrouping: settings?.outlet_grouping ?? prefDefaults.outletGrouping,
    operatingHoursPolicy: settings?.operating_hours_policy ?? prefDefaults.operatingHoursPolicy, outletManagerRequired: settings?.outlet_manager_required ?? prefDefaults.outletManagerRequired,
    outletTemplateAutoAssign: settings?.outlet_template_auto_assign ?? prefDefaults.outletTemplateAutoAssign, defaultUserRole: settings?.default_user_role ?? prefDefaults.defaultUserRole,
    inviteApprovalRequired: settings?.invite_approval_required ?? prefDefaults.inviteApprovalRequired, managerCanReassignTasks: settings?.manager_can_reassign_tasks ?? prefDefaults.managerCanReassignTasks,
    defaultTaskDueTime: settings?.default_task_due_time ?? prefDefaults.defaultTaskDueTime, dailyReminderWindow: settings?.daily_reminder_window ?? prefDefaults.dailyReminderWindow,
    escalationAfterHours: settings?.escalation_after_hours ?? prefDefaults.escalationAfterHours, recurringPublishMode: settings?.recurring_publish_mode ?? prefDefaults.recurringPublishMode,
    formCategoryMode: settings?.form_category_mode ?? prefDefaults.formCategoryMode, templateVersionLock: settings?.template_version_lock ?? prefDefaults.templateVersionLock,
    noteRequiredByDefault: settings?.note_required_by_default ?? prefDefaults.noteRequiredByDefault, signatureRequiredByDefault: settings?.signature_required_by_default ?? prefDefaults.signatureRequiredByDefault,
    reopenSubmissions: settings?.reopen_submissions ?? prefDefaults.reopenSubmissions, lockEditsAfterSubmit: settings?.lock_edits_after_submit ?? prefDefaults.lockEditsAfterSubmit,
    autoCorrectiveAction: settings?.auto_corrective_action ?? prefDefaults.autoCorrectiveAction, digestFrequency: settings?.digest_frequency ?? prefDefaults.digestFrequency,
    scheduledReportAudience: settings?.scheduled_report_audience ?? prefDefaults.scheduledReportAudience, passThreshold: settings?.pass_threshold ?? prefDefaults.passThreshold,
    criticalEscalation: settings?.critical_escalation ?? prefDefaults.criticalEscalation, correctiveActionSlaHours: settings?.corrective_action_sla_hours ?? prefDefaults.correctiveActionSlaHours,
    photoRequiredByDefault: settings?.photo_required_by_default ?? prefDefaults.photoRequiredByDefault, maxUploadMb: settings?.max_upload_mb ?? prefDefaults.maxUploadMb,
    timestampWatermark: settings?.timestamp_watermark ?? prefDefaults.timestampWatermark, gpsWatermark: settings?.gps_watermark ?? prefDefaults.gpsWatermark,
    auditRetentionDays: settings?.audit_retention_days ?? prefDefaults.auditRetentionDays, loginHistoryVisible: settings?.login_history_visible ?? prefDefaults.loginHistoryVisible,
    templateHistoryVisible: settings?.template_history_visible ?? prefDefaults.templateHistoryVisible, exportFormat: settings?.export_format ?? prefDefaults.exportFormat,
    webhookEnabled: settings?.webhook_enabled ?? prefDefaults.webhookEnabled, apiStatusMode: settings?.api_status_mode ?? prefDefaults.apiStatusMode,
    twoFactorRequired: settings?.two_factor_required ?? prefDefaults.twoFactorRequired, passwordRotationDays: settings?.password_rotation_days ?? prefDefaults.passwordRotationDays,
  };
}

function toPayload(p: AdminPrefs): Partial<SettingsResponse> {
  return { date_format: p.dateFormat, currency: p.currency, dashboard_landing: p.dashboardLanding, outlet_grouping: p.outletGrouping, operating_hours_policy: p.operatingHoursPolicy,
    outlet_manager_required: p.outletManagerRequired, outlet_template_auto_assign: p.outletTemplateAutoAssign, default_user_role: p.defaultUserRole, invite_approval_required: p.inviteApprovalRequired,
    manager_can_reassign_tasks: p.managerCanReassignTasks, default_task_due_time: p.defaultTaskDueTime, daily_reminder_window: p.dailyReminderWindow, escalation_after_hours: p.escalationAfterHours,
    recurring_publish_mode: p.recurringPublishMode, form_category_mode: p.formCategoryMode, template_version_lock: p.templateVersionLock, note_required_by_default: p.noteRequiredByDefault,
    signature_required_by_default: p.signatureRequiredByDefault, reopen_submissions: p.reopenSubmissions, lock_edits_after_submit: p.lockEditsAfterSubmit, auto_corrective_action: p.autoCorrectiveAction,
    digest_frequency: p.digestFrequency, scheduled_report_audience: p.scheduledReportAudience, pass_threshold: p.passThreshold, critical_escalation: p.criticalEscalation,
    corrective_action_sla_hours: p.correctiveActionSlaHours, photo_required_by_default: p.photoRequiredByDefault, max_upload_mb: p.maxUploadMb, timestamp_watermark: p.timestampWatermark,
    gps_watermark: p.gpsWatermark, audit_retention_days: p.auditRetentionDays, login_history_visible: p.loginHistoryVisible, template_history_visible: p.templateHistoryVisible,
    export_format: p.exportFormat, webhook_enabled: p.webhookEnabled, api_status_mode: p.apiStatusMode, two_factor_required: p.twoFactorRequired, password_rotation_days: p.passwordRotationDays };
}

function mapForm(settings?: Partial<SettingsResponse> | null): FormValues {
  return {
    organization_name: settings?.organization_name ?? "", workspace_name: settings?.workspace_name ?? "", timezone: settings?.timezone ?? "Asia/Jakarta",
    default_language: settings?.default_language ?? "en", task_auto_archive_days: Number(settings?.task_auto_archive_days ?? 30), evidence_required: Boolean(settings?.evidence_required ?? true),
    approval_required: Boolean(settings?.approval_required ?? true), email_notifications: Boolean(settings?.email_notifications ?? true), dashboard_alerts: Boolean(settings?.dashboard_alerts ?? true),
    overdue_alerts: Boolean(settings?.overdue_alerts ?? true), session_timeout_minutes: Number(settings?.session_timeout_minutes ?? 120), enforce_role_permissions: Boolean(settings?.enforce_role_permissions ?? true),
  };
}

function Toggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (next: boolean) => void }) {
  return <ActionCard title={title} description={description} action={<EnterpriseCheckbox checked={checked} onChange={(event) => onChange(event.target.checked)} />} />;
}

function OutletSettingsWorkspace() { return <main className="p-6"><SectionCard title="Outlet Settings"><p className="text-sm text-slate-500">Outlet settings tetap tersedia untuk bahasa dan password akun outlet.</p></SectionCard></main>; }

export function SettingsWorkspace() {
  const { setLanguage } = useLanguage();
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspaceSnapshot, getServerWorkspaceSnapshot);
  const { settings, isLoading, error, reload, saveSettings, saveError, isSaving } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [prefs, setPrefs] = useState<AdminPrefs>(prefDefaults);
  const [notice, setNotice] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const formValues = useMemo(() => mapForm(settings), [settings]);
  const resolvedPrefs = useMemo(() => mapPrefs(settings), [settings]);
  const { register, control, handleSubmit } = useForm<FormValues>({ resolver: zodResolver(schema) as never, values: formValues });
  const watched = useWatch<FormValues>({ control });
  const form = { ...formValues, ...watched };
  useEffect(() => { setPrefs(resolvedPrefs); }, [resolvedPrefs]);
  if (workspace.mode === "outlet") return <OutletSettingsWorkspace />;
  async function onSave(values: FormValues) {
    try {
      setNotice(null);
      await saveSettings({ ...values, ...toPayload(prefs) });
      setLanguage((values.default_language === "id" ? "id" : "en") as Language);
      await reload();
      setNotice("Pengaturan admin berhasil disimpan.");
    } catch (saveFailure) {
      setNotice(saveFailure instanceof Error ? saveFailure.message : "Gagal menyimpan pengaturan.");
    }
  }
  async function onPasswordSave() {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) { setNotice("Password baru belum cocok atau password saat ini belum diisi."); return; }
    try { setSavingPassword(true); await changePassword({ current_password: currentPassword, new_password: newPassword }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setNotice("Password berhasil diperbarui."); }
    finally { setSavingPassword(false); }
  }
  const update = <K extends keyof AdminPrefs>(key: K, value: AdminPrefs[K]) => setPrefs((current) => ({ ...current, [key]: value }));
  if (isLoading) return <main className="p-6"><p className="text-sm text-emerald-700">Memuat settings...</p></main>;
  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><p className="text-sm font-medium text-emerald-700">Owner & Admin Control</p><h1 className="text-2xl font-semibold text-slate-950">Workspace Settings</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">Semua pengaturan owner/admin sekarang disimpan ke backend settings.</p></div><button form="settings-form" type="submit" disabled={isSaving} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{isSaving ? "Menyimpan..." : "Simpan pengaturan"}</button></div>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {saveError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{saveError}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-4"><MetricCard label="Timezone" value={form.timezone} /><MetricCard label="Approval" value={form.approval_required ? "Wajib" : "Opsional"} /><MetricCard label="Evidence" value={form.evidence_required ? "Required" : "Optional"} /><MetricCard label="Security" value={form.enforce_role_permissions ? "Guarded" : "Basic"} /></div>
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]"><SectionCard title="Menu Settings"><nav className="space-y-2">{tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`w-full rounded-xl border px-4 py-3 text-left ${activeTab === tab.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}><div className="flex items-center gap-3"><Icon className="h-4 w-4 text-emerald-700" /><span className="font-medium text-slate-900">{tab.title}</span></div><p className="mt-1 text-xs text-slate-500">{tab.description}</p></button>; })}</nav></SectionCard>
      <form id="settings-form" onSubmit={handleSubmit(onSave as never)} className="space-y-6">
        {activeTab === "general" ? <SectionCard title="General"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Organization"><EnterpriseInput {...register("organization_name")} /></EnterpriseField><EnterpriseField label="Workspace"><EnterpriseInput {...register("workspace_name")} /></EnterpriseField><EnterpriseField label="Timezone"><EnterpriseSelect {...register("timezone")}><option value="Asia/Jakarta">Asia/Jakarta</option><option value="Asia/Makassar">Asia/Makassar</option><option value="Asia/Jayapura">Asia/Jayapura</option><option value="UTC">UTC</option></EnterpriseSelect></EnterpriseField><EnterpriseField label="Language"><EnterpriseSelect {...register("default_language")}><option value="id">Indonesia</option><option value="en">English</option></EnterpriseSelect></EnterpriseField><EnterpriseField label="Date format"><EnterpriseSelect value={prefs.dateFormat} onChange={(e) => update("dateFormat", e.target.value)}><option value="dd/MM/yyyy">dd/MM/yyyy</option><option value="MM/dd/yyyy">MM/dd/yyyy</option></EnterpriseSelect></EnterpriseField><EnterpriseField label="Currency"><EnterpriseSelect value={prefs.currency} onChange={(e) => update("currency", e.target.value)}><option value="IDR">IDR</option><option value="USD">USD</option></EnterpriseSelect></EnterpriseField></div></SectionCard> : null}
        {activeTab === "outlets" ? <SectionCard title="Outlets"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Outlet grouping"><EnterpriseSelect value={prefs.outletGrouping} onChange={(e) => update("outletGrouping", e.target.value)}><option value="region">Region</option><option value="city">City</option><option value="brand">Brand</option></EnterpriseSelect></EnterpriseField><EnterpriseField label="Operating hours policy"><EnterpriseSelect value={prefs.operatingHoursPolicy} onChange={(e) => update("operatingHoursPolicy", e.target.value)}><option value="inherit-brand">Inherit brand</option><option value="per-outlet">Per outlet</option><option value="locked">Locked</option></EnterpriseSelect></EnterpriseField></div><div className="mt-5 space-y-4"><Toggle title="Outlet manager required" description="PIC wajib ada sebelum publish task." checked={prefs.outletManagerRequired} onChange={(next) => update("outletManagerRequired", next)} /><Toggle title="Auto assign templates" description="Template default ikut ke outlet baru." checked={prefs.outletTemplateAutoAssign} onChange={(next) => update("outletTemplateAutoAssign", next)} /></div></SectionCard> : null}
        {activeTab === "users" ? <SectionCard title="Users & Roles"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Default user role"><EnterpriseSelect value={prefs.defaultUserRole} onChange={(e) => update("defaultUserRole", e.target.value)}><option value="outlet_manager">Outlet Manager</option><option value="staff">Staff</option><option value="area_manager">Area Manager</option><option value="admin">Admin</option></EnterpriseSelect></EnterpriseField></div><div className="mt-5 space-y-4"><Toggle title="Invite approval required" description="User baru perlu approval." checked={prefs.inviteApprovalRequired} onChange={(next) => update("inviteApprovalRequired", next)} /><Toggle title="Manager can reassign tasks" description="Manager dapat pindah assignee." checked={prefs.managerCanReassignTasks} onChange={(next) => update("managerCanReassignTasks", next)} /></div></SectionCard> : null}
        {activeTab === "tasks" ? <SectionCard title="Tasks & SOP"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Auto archive days"><EnterpriseInput type="number" {...register("task_auto_archive_days", { valueAsNumber: true })} /></EnterpriseField><EnterpriseField label="Default due time"><EnterpriseInput type="time" value={prefs.defaultTaskDueTime} onChange={(e) => update("defaultTaskDueTime", e.target.value)} /></EnterpriseField><EnterpriseField label="Daily reminder"><EnterpriseInput type="time" value={prefs.dailyReminderWindow} onChange={(e) => update("dailyReminderWindow", e.target.value)} /></EnterpriseField><EnterpriseField label="Escalation hours"><EnterpriseInput type="number" value={prefs.escalationAfterHours} onChange={(e) => update("escalationAfterHours", Number(e.target.value || 0))} /></EnterpriseField><EnterpriseField label="Recurring publish mode"><EnterpriseSelect value={prefs.recurringPublishMode} onChange={(e) => update("recurringPublishMode", e.target.value)}><option value="auto">Auto</option><option value="review">Review</option><option value="manual">Manual</option></EnterpriseSelect></EnterpriseField></div></SectionCard> : null}
        {activeTab === "forms" ? <SectionCard title="Forms"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Form category mode"><EnterpriseSelect value={prefs.formCategoryMode} onChange={(e) => update("formCategoryMode", e.target.value)}><option value="operational">Operational</option><option value="department">Department</option><option value="mixed">Mixed</option></EnterpriseSelect></EnterpriseField></div><div className="mt-5 space-y-4"><Toggle title="Template version lock" description="Task tetap pakai versi saat publish." checked={prefs.templateVersionLock} onChange={(next) => update("templateVersionLock", next)} /><Toggle title="Note required by default" description="Item baru otomatis minta note." checked={prefs.noteRequiredByDefault} onChange={(next) => update("noteRequiredByDefault", next)} /><Toggle title="Signature required by default" description="Signature default untuk approval." checked={prefs.signatureRequiredByDefault} onChange={(next) => update("signatureRequiredByDefault", next)} /></div></SectionCard> : null}
        {activeTab === "approvals" ? <SectionCard title="Approvals"><div className="space-y-4"><ActionCard title="Approval required" description="Submission perlu review." action={<EnterpriseCheckbox {...register("approval_required")} />} /><Toggle title="Reopen submissions" description="Admin bisa buka ulang submission." checked={prefs.reopenSubmissions} onChange={(next) => update("reopenSubmissions", next)} /><Toggle title="Lock edits after submit" description="Outlet tidak edit lagi setelah submit." checked={prefs.lockEditsAfterSubmit} onChange={(next) => update("lockEditsAfterSubmit", next)} /><Toggle title="Auto corrective action" description="Temuan gagal otomatis dibuatkan action." checked={prefs.autoCorrectiveAction} onChange={(next) => update("autoCorrectiveAction", next)} /></div></SectionCard> : null}
        {activeTab === "notifications" ? <SectionCard title="Notifications"><div className="space-y-4"><ActionCard title="Email notifications" description="Kirim notifikasi ke email." action={<EnterpriseCheckbox {...register("email_notifications")} />} /><ActionCard title="Dashboard alerts" description="Alert di dashboard admin." action={<EnterpriseCheckbox {...register("dashboard_alerts")} />} /><ActionCard title="Overdue alerts" description="Alarm task terlambat." action={<EnterpriseCheckbox {...register("overdue_alerts")} />} /></div><div className="mt-5 grid gap-5 md:grid-cols-2"><EnterpriseField label="Digest frequency"><EnterpriseSelect value={prefs.digestFrequency} onChange={(e) => update("digestFrequency", e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></EnterpriseSelect></EnterpriseField><EnterpriseField label="Report audience"><EnterpriseSelect value={prefs.scheduledReportAudience} onChange={(e) => update("scheduledReportAudience", e.target.value)}><option value="owner-and-admin">Owner + admin</option><option value="owner-only">Owner</option><option value="operations-team">Operations team</option></EnterpriseSelect></EnterpriseField></div></SectionCard> : null}
        {activeTab === "compliance" ? <SectionCard title="Compliance"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Pass threshold"><EnterpriseInput type="number" value={prefs.passThreshold} onChange={(e) => update("passThreshold", Number(e.target.value || 0))} /></EnterpriseField><EnterpriseField label="Corrective action SLA"><EnterpriseInput type="number" value={prefs.correctiveActionSlaHours} onChange={(e) => update("correctiveActionSlaHours", Number(e.target.value || 0))} /></EnterpriseField></div><div className="mt-5"><Toggle title="Critical escalation" description="Temuan kritikal langsung naik." checked={prefs.criticalEscalation} onChange={(next) => update("criticalEscalation", next)} /></div></SectionCard> : null}
        {activeTab === "evidence" ? <SectionCard title="Evidence"><div className="space-y-4"><ActionCard title="Evidence required" description="Evidence backend aktif." action={<EnterpriseCheckbox {...register("evidence_required")} />} /><Toggle title="Photo required by default" description="Photo proof default untuk form baru." checked={prefs.photoRequiredByDefault} onChange={(next) => update("photoRequiredByDefault", next)} /><Toggle title="Timestamp watermark" description="Tambahkan waktu ke bukti." checked={prefs.timestampWatermark} onChange={(next) => update("timestampWatermark", next)} /><Toggle title="GPS watermark" description="Tambahkan lokasi ke bukti." checked={prefs.gpsWatermark} onChange={(next) => update("gpsWatermark", next)} /></div><div className="mt-5 grid gap-5 md:grid-cols-2"><EnterpriseField label="Max upload MB"><EnterpriseInput type="number" value={prefs.maxUploadMb} onChange={(e) => update("maxUploadMb", Number(e.target.value || 0))} /></EnterpriseField></div></SectionCard> : null}
        {activeTab === "audit" ? <SectionCard title="Audit Log"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Audit retention days"><EnterpriseInput type="number" value={prefs.auditRetentionDays} onChange={(e) => update("auditRetentionDays", Number(e.target.value || 0))} /></EnterpriseField></div><div className="mt-5 space-y-4"><Toggle title="Login history visible" description="Tampilkan histori login." checked={prefs.loginHistoryVisible} onChange={(next) => update("loginHistoryVisible", next)} /><Toggle title="Template history visible" description="Tampilkan histori template." checked={prefs.templateHistoryVisible} onChange={(next) => update("templateHistoryVisible", next)} /></div></SectionCard> : null}
        {activeTab === "integrations" ? <SectionCard title="Integrations"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="API status mode"><EnterpriseSelect value={prefs.apiStatusMode} onChange={(e) => update("apiStatusMode", e.target.value)}><option value="connected">Connected</option><option value="monitor-only">Monitor only</option><option value="manual-fallback">Manual fallback</option></EnterpriseSelect></EnterpriseField><EnterpriseField label="Export format"><EnterpriseSelect value={prefs.exportFormat} onChange={(e) => update("exportFormat", e.target.value)}><option value="xlsx">XLSX</option><option value="csv">CSV</option><option value="pdf">PDF</option></EnterpriseSelect></EnterpriseField></div><div className="mt-5"><Toggle title="Webhook enabled" description="Aktifkan webhook untuk sinkron eksternal." checked={prefs.webhookEnabled} onChange={(next) => update("webhookEnabled", next)} /></div></SectionCard> : null}
        {activeTab === "security" ? <SectionCard title="Security"><div className="grid gap-5 md:grid-cols-2"><EnterpriseField label="Session timeout"><EnterpriseInput type="number" {...register("session_timeout_minutes", { valueAsNumber: true })} /></EnterpriseField><EnterpriseField label="Password rotation days"><EnterpriseInput type="number" value={prefs.passwordRotationDays} onChange={(e) => update("passwordRotationDays", Number(e.target.value || 0))} /></EnterpriseField></div><div className="mt-5 space-y-4"><ActionCard title="Enforce role permissions" description="Batasi akses sesuai role." action={<EnterpriseCheckbox {...register("enforce_role_permissions")} />} /><Toggle title="2FA required" description="2FA untuk owner/admin." checked={prefs.twoFactorRequired} onChange={(next) => update("twoFactorRequired", next)} /></div><div className="mt-6 border-t border-slate-100 pt-6"><div className="grid gap-5 md:grid-cols-3"><EnterpriseField label="Current password"><EnterpriseInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></EnterpriseField><EnterpriseField label="New password"><EnterpriseInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></EnterpriseField><EnterpriseField label="Confirm password"><EnterpriseInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></EnterpriseField></div><button type="button" onClick={() => void onPasswordSave()} disabled={savingPassword} className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{savingPassword ? "Menyimpan..." : "Simpan password"}</button></div></SectionCard> : null}
      </form></div>
    </main>
  );
}


