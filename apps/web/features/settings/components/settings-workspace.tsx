"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bell,
  Building2,
  CheckSquare,
  FileText,
  RotateCcw,
  Save,
  Shield,
  Smartphone,
  Trash2,
  Users,
} from "lucide-react";

import {
  changePassword,
  resetWorkspace,
  WORKSPACE_SETTINGS_DEFAULTS,
  type SettingsResponse,
} from "@/features/settings/settings-api";
import { uploadBulkImport, type BulkImportResponse } from "@/features/settings/bulk-import-api";
import { ApiKeysPanel } from "@/features/settings/components/api-keys-panel";
import { IntegrationsStatusPanel } from "@/features/settings/components/integrations-status-panel";
import { NotificationPreferencesPanel } from "@/features/settings/components/notification-preferences-panel";
import { useSettings } from "@/features/settings/hooks/use-settings";
import { clearOfflineClientData } from "@/lib/offline/store";
import { useConfirmation } from "@/shared/confirmation";
import { EnterpriseCheckbox, EnterpriseField, EnterpriseInput, EnterpriseSelect } from "@/shared/form";
import { Language, useLanguage } from "@/shared/i18n";
import { getServerWorkspaceSnapshot, getWorkspaceSnapshot, subscribeWorkspace } from "@/shared/navigation";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { outletService } from "@/services/outlet.service";
import { sendComplianceDigestNow } from "@/services/reports.service";
import {
  getIdentityRoles,
  updateIdentityRolePermissions,
  type IdentityRole,
} from "@/services/identity.service";
import {
  getAllLoginDevices,
  getLoginDevices,
  revokeAnyLoginDevice,
  revokeLoginDevice,
  type LoginDeviceSession,
} from "@/services/auth.service";
import { ActionCard } from "@/shared/ui/cards/action-card";
import { MetricCard } from "@/shared/ui/cards/metric-card";
import { SectionCard } from "@/shared/ui/cards/section-card";

const TASK_SECTION_COLLAPSE_KEY = "novaops_task_section_collapsed";
const RECENT_TEMPLATES_KEY = "novaops-recent-form-templates";

type OwnerAdminState = {
  organization_name: string;
  workspace_name: string;
  timezone: string;
  default_language: string;
  task_auto_archive_days: number;
  evidence_required: boolean;
  approval_required: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  dashboard_alerts: boolean;
  overdue_alerts: boolean;
  session_timeout_minutes: number;
  enforce_role_permissions: boolean;
  default_task_due_time: string;
  daily_reminder_window: string;
  pass_threshold: number;
  auto_corrective_action: boolean;
  corrective_action_sla_hours: number;
  photo_required_by_default: boolean;
  max_upload_mb: number;
  timestamp_watermark: boolean;
  gps_watermark: boolean;
  geofence_enabled: boolean;
  geofence_radius_meters: number;
  outlet_grouping: string;
  default_user_role: string;
  digest_frequency: string;
  scheduled_report_audience: string;
  two_factor_required: boolean;
  password_rotation_days: number;
  webhook_enabled: boolean;
  auto_workflow_on_checklist_fail: boolean;
  checklist_fail_workflow_code: string;
  auto_workflow_on_task_completed: boolean;
  task_completed_workflow_code: string;
  brand_logo_url: string;
  brand_primary_color: string;
  iot_auto_fail_enabled: boolean;
  lms_training_gate_enabled: boolean;
  iot_temp_min_c: number;
  iot_temp_max_c: number;
};

const defaults: OwnerAdminState = {
  organization_name: WORKSPACE_SETTINGS_DEFAULTS.organization_name,
  workspace_name: WORKSPACE_SETTINGS_DEFAULTS.workspace_name,
  timezone: WORKSPACE_SETTINGS_DEFAULTS.timezone,
  default_language: WORKSPACE_SETTINGS_DEFAULTS.default_language,
  task_auto_archive_days: WORKSPACE_SETTINGS_DEFAULTS.task_auto_archive_days,
  evidence_required: WORKSPACE_SETTINGS_DEFAULTS.evidence_required,
  approval_required: WORKSPACE_SETTINGS_DEFAULTS.approval_required,
  email_notifications: WORKSPACE_SETTINGS_DEFAULTS.email_notifications,
  sms_notifications: WORKSPACE_SETTINGS_DEFAULTS.sms_notifications,
  dashboard_alerts: WORKSPACE_SETTINGS_DEFAULTS.dashboard_alerts,
  overdue_alerts: WORKSPACE_SETTINGS_DEFAULTS.overdue_alerts,
  session_timeout_minutes: WORKSPACE_SETTINGS_DEFAULTS.session_timeout_minutes,
  enforce_role_permissions: WORKSPACE_SETTINGS_DEFAULTS.enforce_role_permissions,
  default_task_due_time: WORKSPACE_SETTINGS_DEFAULTS.default_task_due_time,
  daily_reminder_window: WORKSPACE_SETTINGS_DEFAULTS.daily_reminder_window,
  pass_threshold: WORKSPACE_SETTINGS_DEFAULTS.pass_threshold,
  auto_corrective_action: WORKSPACE_SETTINGS_DEFAULTS.auto_corrective_action,
  corrective_action_sla_hours: WORKSPACE_SETTINGS_DEFAULTS.corrective_action_sla_hours,
  photo_required_by_default: WORKSPACE_SETTINGS_DEFAULTS.photo_required_by_default,
  max_upload_mb: WORKSPACE_SETTINGS_DEFAULTS.max_upload_mb,
  timestamp_watermark: WORKSPACE_SETTINGS_DEFAULTS.timestamp_watermark,
  gps_watermark: WORKSPACE_SETTINGS_DEFAULTS.gps_watermark,
  geofence_enabled: WORKSPACE_SETTINGS_DEFAULTS.geofence_enabled,
  geofence_radius_meters: WORKSPACE_SETTINGS_DEFAULTS.geofence_radius_meters,
  outlet_grouping: WORKSPACE_SETTINGS_DEFAULTS.outlet_grouping,
  default_user_role: WORKSPACE_SETTINGS_DEFAULTS.default_user_role,
  digest_frequency: WORKSPACE_SETTINGS_DEFAULTS.digest_frequency,
  scheduled_report_audience: WORKSPACE_SETTINGS_DEFAULTS.scheduled_report_audience,
  two_factor_required: WORKSPACE_SETTINGS_DEFAULTS.two_factor_required,
  password_rotation_days: WORKSPACE_SETTINGS_DEFAULTS.password_rotation_days,
  webhook_enabled: WORKSPACE_SETTINGS_DEFAULTS.webhook_enabled,
  auto_workflow_on_checklist_fail: WORKSPACE_SETTINGS_DEFAULTS.auto_workflow_on_checklist_fail,
  checklist_fail_workflow_code: WORKSPACE_SETTINGS_DEFAULTS.checklist_fail_workflow_code,
  auto_workflow_on_task_completed: WORKSPACE_SETTINGS_DEFAULTS.auto_workflow_on_task_completed,
  task_completed_workflow_code: WORKSPACE_SETTINGS_DEFAULTS.task_completed_workflow_code,
  brand_logo_url: WORKSPACE_SETTINGS_DEFAULTS.brand_logo_url,
  brand_primary_color: WORKSPACE_SETTINGS_DEFAULTS.brand_primary_color,
  iot_auto_fail_enabled: WORKSPACE_SETTINGS_DEFAULTS.iot_auto_fail_enabled,
  lms_training_gate_enabled: WORKSPACE_SETTINGS_DEFAULTS.lms_training_gate_enabled,
  iot_temp_min_c: WORKSPACE_SETTINGS_DEFAULTS.iot_temp_min_c,
  iot_temp_max_c: WORKSPACE_SETTINGS_DEFAULTS.iot_temp_max_c,
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
    sms_notifications: Boolean(settings?.sms_notifications ?? defaults.sms_notifications),
    dashboard_alerts: Boolean(settings?.dashboard_alerts ?? defaults.dashboard_alerts),
    overdue_alerts: Boolean(settings?.overdue_alerts ?? defaults.overdue_alerts),
    session_timeout_minutes: Number(settings?.session_timeout_minutes ?? defaults.session_timeout_minutes),
    enforce_role_permissions: Boolean(settings?.enforce_role_permissions ?? defaults.enforce_role_permissions),
    default_task_due_time: settings?.default_task_due_time ?? defaults.default_task_due_time,
    daily_reminder_window: settings?.daily_reminder_window ?? defaults.daily_reminder_window,
    pass_threshold: Number(settings?.pass_threshold ?? defaults.pass_threshold),
    auto_corrective_action: Boolean(
      settings?.auto_corrective_action ?? defaults.auto_corrective_action
    ),
    corrective_action_sla_hours: Number(settings?.corrective_action_sla_hours ?? defaults.corrective_action_sla_hours),
    photo_required_by_default: Boolean(
      settings?.photo_required_by_default ?? defaults.photo_required_by_default
    ),
    max_upload_mb: Number(settings?.max_upload_mb ?? defaults.max_upload_mb),
    timestamp_watermark: Boolean(settings?.timestamp_watermark ?? defaults.timestamp_watermark),
    gps_watermark: Boolean(settings?.gps_watermark ?? defaults.gps_watermark),
    geofence_enabled: Boolean(settings?.geofence_enabled ?? defaults.geofence_enabled),
    geofence_radius_meters: Number(
      settings?.geofence_radius_meters ?? defaults.geofence_radius_meters
    ),
    outlet_grouping: settings?.outlet_grouping ?? defaults.outlet_grouping,
    default_user_role: settings?.default_user_role ?? defaults.default_user_role,
    digest_frequency: settings?.digest_frequency ?? defaults.digest_frequency,
    scheduled_report_audience:
      settings?.scheduled_report_audience ?? defaults.scheduled_report_audience,
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
    brand_logo_url: settings?.brand_logo_url ?? defaults.brand_logo_url,
    brand_primary_color: settings?.brand_primary_color ?? defaults.brand_primary_color,
    iot_auto_fail_enabled: Boolean(
      settings?.iot_auto_fail_enabled ?? defaults.iot_auto_fail_enabled
    ),
    lms_training_gate_enabled: Boolean(
      settings?.lms_training_gate_enabled ?? defaults.lms_training_gate_enabled
    ),
    iot_temp_min_c: Number(settings?.iot_temp_min_c ?? defaults.iot_temp_min_c),
    iot_temp_max_c: Number(settings?.iot_temp_max_c ?? defaults.iot_temp_max_c),
  };
}

function BulkImportPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResponse | null>(null);

  async function handleUpload() {
    if (!file) {
      onNotice("Pilih file CSV terlebih dahulu.");
      return;
    }

    try {
      setIsUploading(true);
      const response = await uploadBulkImport(file);
      setResult(response);
      onNotice(
        `Import selesai: ${response.outlets_created} outlet, ${response.users_created} user dibuat.`
      );
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal mengimpor CSV.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SectionCard title="Bulk Import CSV">
      <p className="mb-4 text-sm text-slate-500">
        Unggah CSV outlet (<code>name,code,region,district,address</code>) atau user (
        <code>email,name,role,outlet_code</code>). Role: outlet_manager, area_manager, admin.
      </p>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <EnterpriseField label="File CSV">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block w-full text-sm text-slate-600"
          />
        </EnterpriseField>
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={isUploading || !file}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          {isUploading ? "Mengimpor..." : "Impor CSV"}
        </button>
      </div>
      {result ? (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Baris</th>
                <th className="px-4 py-3">Entitas</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pesan</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={`${row.row}-${row.identifier}`} className="border-t border-slate-100">
                  <td className="px-4 py-3">{row.row}</td>
                  <td className="px-4 py-3">{row.entity}</td>
                  <td className="px-4 py-3">{row.identifier}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{row.message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  );
}

function OutletLocationPanel({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const [outlets, setOutlets] = useState<Array<{ id: number; name: string; region: string | null; district: string | null; latitude: number | null; longitude: number | null }>>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | "">("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void outletService
      .listMine()
      .then((items) => {
        setOutlets(items);
        if (items.length > 0) {
          setSelectedOutletId(items[0].id);
          setRegion(items[0].region ?? "");
          setDistrict(items[0].district ?? "");
          setLatitude(items[0].latitude != null ? String(items[0].latitude) : "");
          setLongitude(items[0].longitude != null ? String(items[0].longitude) : "");
        }
      })
      .catch(() => {
        onNotice("Gagal memuat daftar outlet untuk geofence.");
      });
  }, [onNotice]);

  useEffect(() => {
    if (selectedOutletId === "") return;
    const outlet = outlets.find((item) => item.id === selectedOutletId);
    if (!outlet) return;
    setRegion(outlet.region ?? "");
    setDistrict(outlet.district ?? "");
    setLatitude(outlet.latitude != null ? String(outlet.latitude) : "");
    setLongitude(outlet.longitude != null ? String(outlet.longitude) : "");
  }, [outlets, selectedOutletId]);

  async function handleSaveLocation() {
    if (selectedOutletId === "") {
      onNotice("Pilih outlet terlebih dahulu.");
      return;
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      onNotice("Latitude dan longitude harus angka valid.");
      return;
    }

    try {
      setIsSaving(true);
      const updatedRegion = await outletService.updateOutlet(selectedOutletId, {
        region: region.trim() || null,
        district: district.trim() || null,
      });
      const updated = await outletService.updateLocation(selectedOutletId, {
        latitude: lat,
        longitude: lon,
      });
      setOutlets((current) =>
        current.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                region: updatedRegion.region,
                district: updatedRegion.district,
                latitude: updated.latitude,
                longitude: updated.longitude,
              }
            : item
        )
      );
      onNotice(`Data outlet ${updated.name} berhasil disimpan.`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal menyimpan data outlet.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SectionCard title="Outlet Geolocation & Hierarchy">
      <p className="mb-4 text-sm text-slate-500">
        Atur region dan district outlet untuk filter compliance, serta koordinat pusat untuk validasi
        geofence saat submit task.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <EnterpriseField label="Outlet">
          <EnterpriseSelect
            value={selectedOutletId === "" ? "" : String(selectedOutletId)}
            onChange={(event) => setSelectedOutletId(Number(event.target.value))}
          >
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </EnterpriseSelect>
        </EnterpriseField>
        <EnterpriseField label="Region">
          <EnterpriseInput
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="Contoh: Jawa Tengah"
          />
        </EnterpriseField>
        <EnterpriseField label="District">
          <EnterpriseInput
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            placeholder="Contoh: Semarang"
          />
        </EnterpriseField>
        <EnterpriseField label="Latitude">
          <EnterpriseInput value={latitude} onChange={(event) => setLatitude(event.target.value)} />
        </EnterpriseField>
        <EnterpriseField label="Longitude">
          <EnterpriseInput value={longitude} onChange={(event) => setLongitude(event.target.value)} />
        </EnterpriseField>
      </div>
      <button
        type="button"
        onClick={() => void handleSaveLocation()}
        disabled={isSaving || selectedOutletId === ""}
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSaving ? "Menyimpan..." : "Simpan outlet"}
      </button>
    </SectionCard>
  );
}

function formatSessionDate(value: string | null) {
  if (!value) return "Belum ada aktivitas";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function LoginDevicesPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [devices, setDevices] = useState<LoginDeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setDevices(await getLoginDevices());
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal memuat perangkat login.");
    } finally {
      setIsLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  async function handleRevoke(device: LoginDeviceSession) {
    if (device.is_current) {
      onNotice("Perangkat yang sedang dipakai tidak bisa dicabut dari tombol ini.");
      return;
    }

    try {
      setRevokingId(device.id);
      await revokeLoginDevice(device.id);
      setDevices((current) => current.filter((item) => item.id !== device.id));
      onNotice(`${device.device_label} berhasil dieliminasi.`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal mengeliminasi perangkat.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <SectionCard title="Login Devices">
      <div className="mb-4 flex items-start gap-3 text-sm text-slate-500">
        <Smartphone className="mt-0.5 h-4 w-4 text-emerald-700" />
        <p>
          Lihat perangkat yang masih punya sesi login aktif untuk akun ini. Cabut perangkat yang
          tidak dikenal agar tokennya tidak bisa dipakai lagi.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Memuat perangkat login...</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada perangkat login aktif.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{device.device_label}</p>
                  {device.is_current ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      Perangkat ini
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  IP {device.ip_address ?? "-"} • Terakhir aktif {formatSessionDate(device.last_seen_at)}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">{device.user_agent ?? "Unknown user agent"}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(device)}
                disabled={device.is_current || revokingId === device.id}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <Trash2 className="h-4 w-4" />
                {revokingId === device.id ? "Mengeliminasi..." : "Eliminasi"}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function AdminLoginDevicesPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [devices, setDevices] = useState<LoginDeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setDevices(await getAllLoginDevices());
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal memuat semua perangkat user.");
    } finally {
      setIsLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return devices;

    return devices.filter((device) =>
      [
        device.user_full_name,
        device.user_email,
        device.user_role,
        device.device_label,
        device.ip_address,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [devices, search]);

  async function handleRevoke(device: LoginDeviceSession) {
    if (device.is_current) {
      onNotice("Perangkat admin yang sedang dipakai tidak bisa dieliminasi dari tombol ini.");
      return;
    }

    try {
      setRevokingId(device.id);
      await revokeAnyLoginDevice(device.id);
      setDevices((current) => current.filter((item) => item.id !== device.id));
      onNotice(
        `${device.device_label} milik ${device.user_email ?? "user"} berhasil dieliminasi.`
      );
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal mengeliminasi perangkat user.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <SectionCard title="All User Login Devices">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 text-sm text-slate-500">
          <Shield className="mt-0.5 h-4 w-4 text-emerald-700" />
          <p>
            Monitor semua sesi login aktif milik user. Gunakan eliminasi untuk memutus perangkat
            yang mencurigakan atau sudah tidak dipakai.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari user, role, device, IP..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 lg:max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Memuat semua perangkat login...</p>
      ) : filteredDevices.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada perangkat yang cocok.</p>
      ) : (
        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 xl:flex-row xl:items-center xl:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {device.user_full_name ?? device.user_email ?? "Unknown user"}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {device.user_role ?? "role"}
                  </span>
                  {device.is_current ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                      Perangkat ini
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {device.device_label} • {device.user_email ?? "-"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  IP {device.ip_address ?? "-"} • Terakhir aktif {formatSessionDate(device.last_seen_at)}
                </p>
                <p className="mt-1 truncate text-xs text-slate-400">{device.user_agent ?? "Unknown user agent"}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(device)}
                disabled={device.is_current || revokingId === device.id}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
              >
                <Trash2 className="h-4 w-4" />
                {revokingId === device.id ? "Mengeliminasi..." : "Eliminasi"}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function PermissionMatrixPanel({ onNotice }: { onNotice: (message: string) => void }) {
  const [roles, setRoles] = useState<IdentityRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const syncDrafts = useCallback((nextRoles: IdentityRole[]) => {
    setDraftPermissions(
      Object.fromEntries(
        nextRoles.map((role) => [
          role.id,
          role.permissions.map((permission) => permission.code).sort(),
        ])
      )
    );
  }, []);

  useEffect(() => {
    void getIdentityRoles()
      .then((nextRoles) => {
        setRoles(nextRoles);
        syncDrafts(nextRoles);
      })
      .catch((error) => {
        onNotice(error instanceof Error ? error.message : "Gagal memuat permission matrix.");
      })
      .finally(() => setIsLoading(false));
  }, [onNotice, syncDrafts]);

  const permissions = useMemo(() => {
    const map = new Map<string, string>();
    roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        map.set(permission.code, permission.name);
      });
    });
    return Array.from(map.entries()).sort(([first], [second]) => first.localeCompare(second));
  }, [roles]);

  function togglePermission(roleId: string, code: string) {
    setDraftPermissions((current) => {
      const currentCodes = new Set(current[roleId] ?? []);

      if (currentCodes.has(code)) {
        currentCodes.delete(code);
      } else {
        currentCodes.add(code);
      }

      return {
        ...current,
        [roleId]: Array.from(currentCodes).sort(),
      };
    });
  }

  function isRoleDirty(role: IdentityRole) {
    const original = role.permissions.map((permission) => permission.code).sort().join("|");
    const draft = (draftPermissions[role.id] ?? []).slice().sort().join("|");

    return original !== draft;
  }

  async function handleSaveRole(role: IdentityRole) {
    const permissionCodes = draftPermissions[role.id] ?? [];

    setSavingRoleId(role.id);

    try {
      const updatedRole = await updateIdentityRolePermissions(role.id, permissionCodes);
      const nextRoles = roles.map((currentRole) =>
        currentRole.id === updatedRole.id ? updatedRole : currentRole
      );

      setRoles(nextRoles);
      syncDrafts(nextRoles);
      onNotice(`Permission ${role.name} berhasil diperbarui.`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal menyimpan permission role.");
    } finally {
      setSavingRoleId(null);
    }
  }

  function handleResetRole(role: IdentityRole) {
    setDraftPermissions((current) => ({
      ...current,
      [role.id]: role.permissions.map((permission) => permission.code).sort(),
    }));
  }

  return (
    <SectionCard title="Permission Matrix">
      <p className="mb-4 text-sm text-slate-500">
        Audit dan ubah hak akses per role. Simpan perubahan per role agar review akses tetap jelas.
      </p>
      {isLoading ? (
        <p className="text-sm text-slate-500">Memuat permission matrix...</p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3">Permission</th>
                  {roles.map((role) => (
                    <th key={role.id} className="px-4 py-3">{role.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map(([code, name]) => (
                  <tr key={code} className="border-t border-slate-100">
                    <td className="sticky left-0 bg-white px-4 py-3">
                      <p className="font-semibold text-slate-900">{code}</p>
                      <p className="text-xs text-slate-500">{name}</p>
                    </td>
                    {roles.map((role) => {
                      const checked = draftPermissions[role.id]?.includes(code) ?? false;
                      const isProtectedAdminPermission =
                        (role.slug === "owner" || role.slug === "admin") && code === "user.edit";

                      return (
                        <td key={`${role.id}-${code}`} className="px-4 py-3">
                          <EnterpriseCheckbox
                            checked={checked}
                            disabled={savingRoleId === role.id || isProtectedAdminPermission}
                            onChange={() => togglePermission(role.id, code)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => {
              const dirty = isRoleDirty(role);

              return (
                <div key={role.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-bold text-slate-950">{role.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(draftPermissions[role.id] ?? []).length} permission aktif
                    {dirty ? " - belum disimpan" : ""}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={!dirty || savingRoleId === role.id}
                      onClick={() => void handleSaveRole(role)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savingRoleId === role.id ? "Menyimpan" : "Simpan"}
                    </button>
                    <button
                      type="button"
                      disabled={!dirty || savingRoleId === role.id}
                      onClick={() => handleResetRole(role)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      aria-label={`Reset ${role.name}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
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

function ResetWorkspacePanel({ onNotice }: { onNotice: (message: string) => void }) {
  const confirm = useConfirmation();
  const queryClient = useQueryClient();
  const { reload } = useSettings();
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  async function handleReset() {
    if (confirmPhrase.trim().toUpperCase() !== "RESET") {
      onNotice('Ketik "RESET" untuk konfirmasi.');
      return;
    }

    const confirmed = await confirm({
      title: "Reset Workspace ke Default",
      description:
        "Semua task, form, submission, draft, notifikasi, dan data operasional akan dihapus permanen. Pengaturan workspace akan dikembalikan ke default. User, outlet, dan login admin tetap dipertahankan.\n\nLanjutkan?",
      variant: "danger",
      confirmText: "Reset ke default",
      cancelText: "Batal",
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsResetting(true);
      const result = await resetWorkspace(confirmPhrase);
      await clearOfflineClientData();
      localStorage.removeItem(TASK_SECTION_COLLAPSE_KEY);
      localStorage.removeItem(RECENT_TEMPLATES_KEY);
      await reload();
      await queryClient.invalidateQueries();
      setConfirmPhrase("");
      onNotice(result.message);
      window.location.reload();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal mereset workspace.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SectionCard title="Reset Workspace (Smoke Test)">
      <p className="mb-4 text-sm text-red-700">
        Fitur ini menghapus semua task, form, submission, draft, riwayat notifikasi, dan data
        operasional lainnya. Pengaturan workspace dikembalikan ke default. User, outlet, role, dan
        login admin tetap dipertahankan. Gunakan hanya untuk smoke testing.
      </p>
      <EnterpriseField label='Ketik "RESET" untuk konfirmasi'>
        <EnterpriseInput
          value={confirmPhrase}
          onChange={(event) => setConfirmPhrase(event.target.value)}
          placeholder="RESET"
          autoComplete="off"
        />
      </EnterpriseField>
      <button
        type="button"
        onClick={() => void handleReset()}
        disabled={isResetting || confirmPhrase.trim().toUpperCase() !== "RESET"}
        className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isResetting ? "Mereset..." : "Reset ke default"}
      </button>
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
  t,
}: {
  settings?: SettingsResponse;
  notice: string | null;
  setNotice: (message: string | null) => void;
  outletName?: string;
  t: (key: string) => string;
}) {
  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("settings.outletWorkspaceEyebrow")}</p>
        <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">{t("settings.outletWorkspaceTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("settings.outletWorkspaceDescription").replace(
            "{outlet}",
            outletName ?? "outlet ini"
          )}
        </p>
      </div>
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
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
  t,
}: {
  settings?: SettingsResponse;
  notice: string | null;
  setNotice: (message: string | null) => void;
  t: (key: string) => string;
}) {
  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("settings.areaEyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("settings.areaTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("settings.areaDescription")}</p>
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
  const { setLanguage, t } = useLanguage();
  const workspace = useSyncExternalStore(subscribeWorkspace, getWorkspaceSnapshot, getServerWorkspaceSnapshot);
  const { settings, isLoading, error, reload, saveSettings, saveError, isSaving } = useSettings();
  const [state, setState] = useState<OwnerAdminState>(defaults);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"org" | "operations" | "integrations">("org");

  useEffect(() => {
    setState(buildOwnerAdminState(settings));
  }, [settings]);

  const summaryCards = useMemo(
    () => [
      { label: "Timezone", value: state.timezone },
      { label: "Pass score", value: `${state.pass_threshold}%` },
      { label: "CAPA", value: state.auto_corrective_action ? "Aktif" : "Mati" },
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

  async function handleSendDigestNow() {
    try {
      setIsSendingDigest(true);
      const result = await sendComplianceDigestNow();
      setNotice(
        result.sent
          ? `Compliance digest terkirim ke ${result.delivered}/${result.recipients} recipient.`
          : `Compliance digest tidak terkirim: ${result.reason}.`
      );
    } catch (sendFailure) {
      setNotice(sendFailure instanceof Error ? sendFailure.message : "Gagal mengirim compliance digest.");
    } finally {
      setIsSendingDigest(false);
    }
  }

  if (isLoading) {
    return (
      <main className={mobileDashboardMainClass}>
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
        t={t}
      />
    );
  }

  if (workspace.mode === "area") {
    return (
      <AreaManagerSettingsWorkspace
        settings={settings}
        notice={notice}
        setNotice={setNotice}
        t={t}
      />
    );
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">{t("settings.ownerEyebrow")}</p>
          <h1 className="text-2xl font-semibold text-slate-950">{t("settings.ownerTitle")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("settings.ownerDescription")}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          {isSaving ? t("common.saving") : t("common.saveSettings")}
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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {(
          [
            ["org", t("settings.organization")],
            ["operations", t("settings.operations")],
            ["integrations", t("settings.integrationsTab")],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSettingsTab(tab)}
            className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition sm:px-4 ${
              settingsTab === tab
                ? "bg-emerald-700 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {settingsTab === "org" ? (
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
            <EnterpriseField label="Brand logo URL">
              <EnterpriseInput
                value={state.brand_logo_url}
                onChange={(event) => update("brand_logo_url", event.target.value)}
                placeholder="https://cdn.example.com/logo.png"
              />
            </EnterpriseField>
            <EnterpriseField label="Brand primary color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={state.brand_primary_color}
                  onChange={(event) => update("brand_primary_color", event.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-xl border border-slate-200 bg-white"
                />
                <EnterpriseInput
                  value={state.brand_primary_color}
                  onChange={(event) => update("brand_primary_color", event.target.value)}
                  placeholder="#047857"
                />
              </div>
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
            <ActionCard
              title="Auto corrective action (CAPA)"
              description="ON: task perbaikan otomatis saat checklist gagal. OFF: menu CAPA disembunyikan dan tidak ada CAPA baru."
              action={
                <EnterpriseCheckbox
                  checked={state.auto_corrective_action}
                  onChange={(event) => update("auto_corrective_action", event.target.checked)}
                />
              }
            />
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
      ) : null}

      {settingsTab === "operations" ? (
      <>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Execution Controls">
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard title="Evidence required" description="Task wajib membawa evidence." action={<EnterpriseCheckbox checked={state.evidence_required} onChange={(event) => update("evidence_required", event.target.checked)} />} />
            <ActionCard title="Photo required by default" description="Submit task outlet wajib sertakan bukti foto." action={<EnterpriseCheckbox checked={state.photo_required_by_default} onChange={(event) => update("photo_required_by_default", event.target.checked)} />} />
            <ActionCard title="Timestamp watermark" description="Tambahkan cap waktu pada foto evidence sebelum upload." action={<EnterpriseCheckbox checked={state.timestamp_watermark} onChange={(event) => update("timestamp_watermark", event.target.checked)} />} />
            <ActionCard title="GPS on evidence" description="Simpan koordinat GPS pada metadata evidence (permission browser diperlukan)." action={<EnterpriseCheckbox checked={state.gps_watermark} onChange={(event) => update("gps_watermark", event.target.checked)} />} />
            <ActionCard title="Geofence enforcement" description="Wajibkan crew berada di radius outlet saat submit checklist." action={<EnterpriseCheckbox checked={state.geofence_enabled} onChange={(event) => update("geofence_enabled", event.target.checked)} />} />
            <ActionCard title="IoT auto-fail checklist" description="Gagalkan checklist jika probe suhu terakhir di luar ambang cold chain." action={<EnterpriseCheckbox checked={state.iot_auto_fail_enabled} onChange={(event) => update("iot_auto_fail_enabled", event.target.checked)} />} />
            <EnterpriseField label="IoT temp min (°C)">
              <EnterpriseInput
                type="number"
                value={state.iot_temp_min_c}
                onChange={(event) => update("iot_temp_min_c", Number(event.target.value || 0))}
                disabled={!state.iot_auto_fail_enabled}
              />
            </EnterpriseField>
            <EnterpriseField label="IoT temp max (°C)">
              <EnterpriseInput
                type="number"
                value={state.iot_temp_max_c}
                onChange={(event) => update("iot_temp_max_c", Number(event.target.value || 0))}
                disabled={!state.iot_auto_fail_enabled}
              />
            </EnterpriseField>
            <ActionCard title="LMS training gate" description="Blokir submit task sampai modul pelatihan wajib selesai." action={<EnterpriseCheckbox checked={state.lms_training_gate_enabled} onChange={(event) => update("lms_training_gate_enabled", event.target.checked)} />} />
            <EnterpriseField label="Geofence radius (meters)">
              <EnterpriseInput
                type="number"
                value={state.geofence_radius_meters}
                onChange={(event) =>
                  update("geofence_radius_meters", Number(event.target.value || 0))
                }
                disabled={!state.geofence_enabled}
              />
            </EnterpriseField>
            <EnterpriseField label="Session timeout">
              <EnterpriseSelect
                value={String(state.session_timeout_minutes)}
                onChange={(event) => update("session_timeout_minutes", Number(event.target.value))}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </EnterpriseSelect>
            </EnterpriseField>
            <ActionCard title="Enforce role permissions" description="Beda akses owner, area manager, dan outlet tetap dijaga." action={<EnterpriseCheckbox checked={state.enforce_role_permissions} onChange={(event) => update("enforce_role_permissions", event.target.checked)} />} />
          </div>
        </SectionCard>

        <LoginDevicesPanel onNotice={(message) => setNotice(message)} />

        <AdminLoginDevicesPanel onNotice={(message) => setNotice(message)} />

        <PermissionMatrixPanel onNotice={(message) => setNotice(message)} />

        <SectionCard title="Notifications">
          <div className="space-y-4">
            <ActionCard title="Dashboard alerts" description="Tampilkan alert operasional di dashboard." action={<EnterpriseCheckbox checked={state.dashboard_alerts} onChange={(event) => update("dashboard_alerts", event.target.checked)} />} />
            <ActionCard title="Overdue alerts" description="Peringatan untuk task yang melewati due time." action={<EnterpriseCheckbox checked={state.overdue_alerts} onChange={(event) => update("overdue_alerts", event.target.checked)} />} />
            <ActionCard title="Email notifications" description="Kirim email operasional untuk checklist gagal, overdue, dan due soon." action={<EnterpriseCheckbox checked={state.email_notifications} onChange={(event) => update("email_notifications", event.target.checked)} />} />
            <ActionCard title="SMS notifications" description="Kirim SMS ke nomor telepon user (Twilio) untuk alert task overdue dan assign." action={<EnterpriseCheckbox checked={state.sms_notifications} onChange={(event) => update("sms_notifications", event.target.checked)} />} />
            <EnterpriseField label="Scheduled report frequency">
              <EnterpriseSelect
                value={state.digest_frequency}
                onChange={(event) => update("digest_frequency", event.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </EnterpriseSelect>
            </EnterpriseField>
            <EnterpriseField label="Scheduled report audience">
              <EnterpriseSelect
                value={state.scheduled_report_audience}
                onChange={(event) => update("scheduled_report_audience", event.target.value)}
              >
                <option value="owner-and-admin">Owner & Admin</option>
                <option value="owner-only">Owner only</option>
                <option value="admin-only">Admin only</option>
              </EnterpriseSelect>
            </EnterpriseField>
            <button
              type="button"
              onClick={() => void handleSendDigestNow()}
              disabled={isSendingDigest || !state.email_notifications}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              {isSendingDigest ? "Sending digest..." : "Send compliance digest now"}
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Email membutuhkan konfigurasi SMTP di server (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
            SMS membutuhkan `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` dan nomor telepon user terisi.
          </p>
        </SectionCard>
      </div>

      <NotificationPreferencesPanel />
      </>
      ) : null}

      {settingsTab === "integrations" ? (
      <>
      <IntegrationsStatusPanel />

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
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/webhooks"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Webhooks
            </Link>
            <Link
              href="/dashboard/workflows"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Workflows
            </Link>
            <Link
              href="/dashboard/ops-health"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Ops Health
            </Link>
            <Link
              href="/dashboard/mobile-app"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Mobile App
            </Link>
          </div>
        </SectionCard>
      </div>

      <OutletLocationPanel onNotice={(message) => setNotice(message)} />

      <ApiKeysPanel />

      <BulkImportPanel onNotice={(message) => setNotice(message)} />

      <ResetWorkspacePanel onNotice={(message) => setNotice(message)} />

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
                <p>Fokus eksekusi Task, submit My Form, dan melihat Notifications outlet.</p>
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
      </>
      ) : null}
    </main>
  );
}
