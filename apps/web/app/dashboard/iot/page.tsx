"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Edit2, Plus, Radio, Thermometer, WifiOff } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { listIotReadings, listIotSensorHealth } from "@/services/iot.service";
import {
  listEquipmentHealth,
  listEquipmentRegister,
  listTemperatureLog,
  createEquipmentRegisterItem,
  updateEquipmentRegisterItem,
  type EquipmentRegisterItem,
  type EquipmentRegisterPayload,
} from "@/services/asset.service";
import { buildApiUrl } from "@/lib/api-url";
import { useLanguage } from "@/shared/i18n";

function buildLast24hChart(readings: Awaited<ReturnType<typeof listIotReadings>>) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const buckets = new Map<string, number>();

  for (const reading of readings) {
    const ts = new Date(reading.recorded_at).getTime();
    if (ts < dayAgo) continue;
    const hour = new Date(reading.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    buckets.set(hour, reading.value);
  }

  return Array.from(buckets.entries()).map(([hour, value]) => ({ hour, value }));
}

const emptyAssetForm: EquipmentRegisterPayload = {
  name: "",
  outlet_id: null,
  category: "equipment",
  serial_number: null,
  vendor: null,
  location: null,
  status: "active",
  lifecycle_status: "in_service",
  replacement_for_id: null,
  gateway_id: null,
  pairing_code: null,
  gateway_provisioned_at: null,
  battery_level: null,
  battery_alert_threshold: 20,
  sensor_enabled: true,
  calibration_status: "not_required",
  replacement_approval_status: "not_requested",
  replacement_requested_at: null,
  replacement_approved_at: null,
  qr_code: null,
  maintenance_due_at: null,
  calibration_due_at: null,
  notes: null,
};

function normalizeDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function IotDashboardPage() {
  const { t } = useLanguage();
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState<EquipmentRegisterPayload>(emptyAssetForm);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const readingsQuery = useQuery({
    queryKey: ["iot-readings"],
    queryFn: () => listIotReadings({ limit: 200 }),
    retry: false,
  });
  const healthQuery = useQuery({
    queryKey: ["iot-sensor-health"],
    queryFn: listIotSensorHealth,
    retry: false,
  });
  const equipmentQuery = useQuery({
    queryKey: ["equipment-health"],
    queryFn: listEquipmentHealth,
    retry: false,
  });
  const registerQuery = useQuery({
    queryKey: ["equipment-register"],
    queryFn: listEquipmentRegister,
    retry: false,
  });
  const temperatureLogQuery = useQuery({
    queryKey: ["temperature-log"],
    queryFn: listTemperatureLog,
    retry: false,
  });

  const readings = readingsQuery.data ?? [];
  const healthRows = healthQuery.data ?? [];
  const equipmentRows = equipmentQuery.data ?? [];
  const registerRows = registerQuery.data ?? [];
  const temperatureRows = temperatureLogQuery.data ?? [];
  const alertSensors = healthRows.filter((row) => row.status === "alert").length;
  const offlineSensors = healthRows.filter((row) => row.status === "offline").length;
  const chartData = buildLast24hChart(readings);
  const ingestUrl = buildApiUrl("/api/v1/iot/ingest");

  function editAsset(asset: EquipmentRegisterItem) {
    setEditingAssetId(asset.id);
    setAssetForm({
      name: asset.name,
      outlet_id: asset.outlet_id,
      category: asset.category,
      serial_number: asset.serial_number,
      vendor: asset.vendor,
      location: asset.location,
      status: asset.status,
      lifecycle_status: asset.lifecycle_status,
      replacement_for_id: asset.replacement_for_id,
      gateway_id: asset.gateway_id,
      pairing_code: asset.pairing_code,
      gateway_provisioned_at: normalizeDateInput(asset.gateway_provisioned_at),
      battery_level: asset.battery_level,
      battery_alert_threshold: asset.battery_alert_threshold,
      sensor_enabled: asset.sensor_enabled,
      calibration_status: asset.calibration_status,
      replacement_approval_status: asset.replacement_approval_status,
      replacement_requested_at: asset.replacement_requested_at,
      replacement_approved_at: asset.replacement_approved_at,
      qr_code: asset.qr_code,
      maintenance_due_at: normalizeDateInput(asset.maintenance_due_at),
      calibration_due_at: normalizeDateInput(asset.calibration_due_at),
      notes: asset.notes,
    });
    setAssetError(null);
    setAssetFormOpen(true);
  }

  function resetAssetForm() {
    setEditingAssetId(null);
    setAssetForm(emptyAssetForm);
    setAssetError(null);
    setAssetFormOpen(false);
  }

  async function saveAsset() {
    if (!assetForm.name.trim()) {
      setAssetError("Nama asset wajib diisi.");
      return;
    }

    const payload = {
      ...assetForm,
      name: assetForm.name.trim(),
      category: assetForm.category.trim() || "equipment",
      outlet_id: assetForm.outlet_id?.trim() || null,
      serial_number: assetForm.serial_number?.trim() || null,
      vendor: assetForm.vendor?.trim() || null,
      location: assetForm.location?.trim() || null,
      replacement_for_id: assetForm.replacement_for_id?.trim() || null,
      gateway_id: assetForm.gateway_id?.trim() || null,
      pairing_code: assetForm.pairing_code?.trim() || null,
      gateway_provisioned_at: assetForm.gateway_provisioned_at || null,
      qr_code: assetForm.qr_code?.trim() || null,
      maintenance_due_at: assetForm.maintenance_due_at || null,
      calibration_due_at: assetForm.calibration_due_at || null,
      notes: assetForm.notes?.trim() || null,
    };

    try {
      setIsSavingAsset(true);
      if (editingAssetId) {
        await updateEquipmentRegisterItem(editingAssetId, payload);
      } else {
        await createEquipmentRegisterItem(payload);
      }
      await Promise.all([registerQuery.refetch(), equipmentQuery.refetch()]);
      resetAssetForm();
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Gagal menyimpan asset.");
    } finally {
      setIsSavingAsset(false);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("iot.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("iot.title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("iot.subtitle")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Thermometer className="size-4" />
            <p className="text-sm">{t("iot.readingsCount")}</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{readings.length}</p>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${
          alertSensors > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
        }`}>
          <div className="flex items-center gap-2 text-slate-600">
            <AlertTriangle className="size-4" />
            <p className="text-sm">Sensor alerts</p>
          </div>
          <p className={`mt-2 text-3xl font-semibold ${alertSensors > 0 ? "text-red-700" : "text-emerald-700"}`}>
            {alertSensors}
          </p>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${
          offlineSensors > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
        }`}>
          <div className="flex items-center gap-2 text-slate-600">
            <WifiOff className="size-4" />
            <p className="text-sm">Offline sensors</p>
          </div>
          <p className={`mt-2 text-3xl font-semibold ${offlineSensors > 0 ? "text-amber-700" : "text-slate-950"}`}>
            {offlineSensors}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Sensor health</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {healthQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading sensor health...</p>
          ) : healthRows.length ? (
            healthRows.slice(0, 9).map((sensor) => (
              <div key={`${sensor.outlet_id}-${sensor.sensor_type}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{sensor.sensor_type}</p>
                    <p className="mt-1 text-xs text-slate-500">Outlet {sensor.outlet_id.slice(0, 8)}...</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    sensor.status === "alert"
                      ? "bg-red-100 text-red-700"
                      : sensor.status === "offline"
                        ? "bg-amber-100 text-amber-700"
                        : sensor.status === "stale"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {sensor.status}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-950">
                  {sensor.latest_value ?? "-"}{sensor.unit ?? ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">{sensor.message}</p>
                {sensor.gateway_id ? (
                  <p className="mt-1 text-xs text-slate-500">Gateway: {sensor.gateway_id}</p>
                ) : null}
                {sensor.calibration_due_at ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Calibration due: {new Date(sensor.calibration_due_at).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Belum ada sensor health.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Equipment health</h2>
            <p className="mt-1 text-sm text-slate-500">
              {registerRows.length} registered assets, {equipmentRows.length} health rows.
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Equipment</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Latest</th>
                <th className="px-3 py-2">Calibration</th>
                <th className="px-3 py-2">Gateway</th>
              </tr>
            </thead>
            <tbody>
              {equipmentQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    Loading equipment...
                  </td>
                </tr>
              ) : equipmentRows.length ? (
                equipmentRows.slice(0, 25).map((equipment) => (
                  <tr key={equipment.id} className="border-b border-slate-100">
                    <td className="px-3 py-3">
                      <p className="font-bold text-slate-950">{equipment.name}</p>
                      <p className="text-xs text-slate-500">Outlet {equipment.outlet_id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        equipment.status === "alert"
                          ? "bg-red-100 text-red-700"
                          : equipment.status === "offline"
                            ? "bg-amber-100 text-amber-700"
                            : equipment.status === "stale"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {equipment.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {equipment.latest_value ?? "-"}{equipment.unit ?? ""}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {equipment.calibration_due_at
                        ? new Date(equipment.calibration_due_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {equipment.gateway_id ?? "-"}
                      {equipment.gateway_status ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                          {equipment.gateway_status}
                        </span>
                      ) : null}
                      {equipment.battery_level != null ? (
                        <p className="mt-1 text-xs text-slate-500">Battery {equipment.battery_level}%</p>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    Belum ada equipment yang terhubung sensor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Asset register</h2>
          <button
            type="button"
            onClick={() => {
              setEditingAssetId(null);
              setAssetForm(emptyAssetForm);
              setAssetFormOpen((current) => !current);
              setAssetError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Add asset
          </button>
        </div>
        {assetFormOpen ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Asset name" value={assetForm.name} onChange={(event) => setAssetForm((form) => ({ ...form, name: event.target.value }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Category" value={assetForm.category} onChange={(event) => setAssetForm((form) => ({ ...form, category: event.target.value }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Outlet ID" value={assetForm.outlet_id ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, outlet_id: event.target.value || null }))} />
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={assetForm.status} onChange={(event) => setAssetForm((form) => ({ ...form, status: event.target.value }))}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="disabled">Disabled</option>
              </select>
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={assetForm.lifecycle_status} onChange={(event) => setAssetForm((form) => ({ ...form, lifecycle_status: event.target.value }))}>
                <option value="in_service">In service</option>
                <option value="replacement_due">Replacement due</option>
                <option value="replaced">Replaced</option>
                <option value="retired">Retired</option>
              </select>
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Serial number" value={assetForm.serial_number ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, serial_number: event.target.value || null }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Vendor" value={assetForm.vendor ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, vendor: event.target.value || null }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Location" value={assetForm.location ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, location: event.target.value || null }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Gateway ID" value={assetForm.gateway_id ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, gateway_id: event.target.value || null }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Pairing code" value={assetForm.pairing_code ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, pairing_code: event.target.value || null }))} />
              <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Battery %" value={assetForm.battery_level ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, battery_level: event.target.value ? Number(event.target.value) : null }))} />
              <input type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Battery alert threshold" value={assetForm.battery_alert_threshold ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, battery_alert_threshold: event.target.value ? Number(event.target.value) : null }))} />
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Replacement for asset ID" value={assetForm.replacement_for_id ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, replacement_for_id: event.target.value || null }))} />
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={assetForm.replacement_approval_status} onChange={(event) => setAssetForm((form) => ({ ...form, replacement_approval_status: event.target.value }))}>
                <option value="not_requested">Replacement not requested</option>
                <option value="pending">Replacement pending</option>
                <option value="approved">Replacement approved</option>
                <option value="rejected">Replacement rejected</option>
              </select>
              <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={assetForm.calibration_status} onChange={(event) => setAssetForm((form) => ({ ...form, calibration_status: event.target.value }))}>
                <option value="not_required">Calibration not required</option>
                <option value="due">Calibration due</option>
                <option value="pending_approval">Pending approval</option>
                <option value="approved">Calibration approved</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" checked={assetForm.sensor_enabled} onChange={(event) => setAssetForm((form) => ({ ...form, sensor_enabled: event.target.checked }))} />
                Sensor enabled
              </label>
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="QR code" value={assetForm.qr_code ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, qr_code: event.target.value || null }))} />
              <label className="text-xs font-bold text-slate-500">
                Gateway provisioned
                <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={assetForm.gateway_provisioned_at ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, gateway_provisioned_at: event.target.value || null }))} />
              </label>
              <label className="text-xs font-bold text-slate-500">
                Maintenance due
                <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={assetForm.maintenance_due_at ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, maintenance_due_at: event.target.value || null }))} />
              </label>
              <label className="text-xs font-bold text-slate-500">
                Calibration due
                <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" value={assetForm.calibration_due_at ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, calibration_due_at: event.target.value || null }))} />
              </label>
              <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm xl:col-span-2" placeholder="Notes" value={assetForm.notes ?? ""} onChange={(event) => setAssetForm((form) => ({ ...form, notes: event.target.value || null }))} />
            </div>
            {assetError ? <p className="mt-3 text-sm font-semibold text-red-600">{assetError}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveAsset()} disabled={isSavingAsset} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300">
                {isSavingAsset ? "Saving..." : editingAssetId ? "Update asset" : "Create asset"}
              </button>
              <button type="button" onClick={resetAssetForm} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {registerQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading assets...</p>
          ) : registerRows.length ? (
            registerRows.slice(0, 12).map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{asset.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{asset.category}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">
                    {asset.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Serial: {asset.serial_number ?? "-"}</p>
                  <p>Location: {asset.location ?? "-"}</p>
                  <p>Vendor: {asset.vendor ?? "-"}</p>
                  <p>Gateway: {asset.gateway_id ?? "-"}</p>
                  <p>Pairing: {asset.pairing_code ?? "-"}</p>
                  <p>Battery: {asset.battery_level != null ? `${asset.battery_level}%` : "-"}</p>
                  <p>Lifecycle: {asset.lifecycle_status}</p>
                  <p>Replacement: {asset.replacement_approval_status}</p>
                  <p>Calibration: {asset.calibration_status}</p>
                  <p>Sensor: {asset.sensor_enabled ? "Enabled" : "Disabled"}</p>
                  <p>
                    Maintenance:{" "}
                    {asset.maintenance_due_at
                      ? new Date(asset.maintenance_due_at).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => editAsset(asset)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
                >
                  <Edit2 className="size-3.5" />
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Belum ada asset manual. Sensor tetap muncul otomatis di Equipment health.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <p className="text-sm font-semibold text-slate-800">{t("iot.ingestUrl")}</p>
          <code className="mt-2 block overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
            POST {ingestUrl}
          </code>
          <p className="mt-2 text-xs text-slate-500">{t("iot.ingestHint")}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">{t("iot.chartTitle")}</h2>
        <div className="mt-4 h-64">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#047857" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500">{t("iot.noChartData")}</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Food safety temperature log</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Recorded</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Threshold</th>
                <th className="px-3 py-2">Gateway</th>
              </tr>
            </thead>
            <tbody>
              {temperatureLogQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    Loading temperature log...
                  </td>
                </tr>
              ) : temperatureRows.length ? (
                temperatureRows.slice(0, 25).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(row.recorded_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-950">
                      {row.value}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        row.status === "pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.threshold_min}-{row.threshold_max}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.gateway_id ?? "-"}
                      {row.gateway_status ? <p className="text-xs text-slate-500">{row.gateway_status}</p> : null}
                      {row.battery_level != null ? <p className="text-xs text-slate-500">Battery {row.battery_level}%</p> : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-slate-500">
                    Belum ada temperature log dari sensor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{t("iot.tableTitle")}</h2>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700"
          >
            {t("iot.openSettings")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">{t("iot.colType")}</th>
                <th className="px-3 py-2">{t("iot.colValue")}</th>
                <th className="px-3 py-2">{t("iot.colOutlet")}</th>
                <th className="px-3 py-2">{t("iot.colRecorded")}</th>
              </tr>
            </thead>
            <tbody>
              {readingsQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-slate-500">
                    {t("iot.loading")}
                  </td>
                </tr>
              ) : readings.length ? (
                readings.slice(0, 50).map((reading) => (
                  <tr key={reading.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-900">{reading.sensor_type}</td>
                    <td className="px-3 py-3">
                      {reading.value}
                      {reading.unit ? ` ${reading.unit}` : ""}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{reading.outlet_id.slice(0, 8)}…</td>
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(reading.recorded_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-slate-500">
                    {t("iot.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-700">
        <div className="flex items-start gap-2">
          <Radio className="mt-0.5 size-4 text-emerald-700" />
          <p>{t("iot.evaluateHint")}</p>
        </div>
      </section>
    </main>
  );
}
