"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BatteryWarning, ClipboardCheck, PackageCheck, ShoppingCart, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { processBatteryAlerts } from "@/services/asset.service";
import {
  createEnterpriseItem,
  getEnterpriseSummary,
  listEnterpriseItems,
  type InventoryCountItem,
  type LaborAttendanceItem,
  type PurchaseRequestItem,
  type SupportItem,
} from "@/services/enterprise-suite.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";

const nowLocal = () => new Date().toISOString().slice(0, 16);

export default function EnterpriseSuitePage() {
  const [message, setMessage] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState<Omit<InventoryCountItem, "id">>({
    outlet_id: null,
    item_name: "",
    unit: "unit",
    expected_quantity: 0,
    actual_quantity: 0,
    unit_cost: 0,
    reason: null,
    counted_at: null,
  });
  const [purchaseForm, setPurchaseForm] = useState<Omit<PurchaseRequestItem, "id">>({
    outlet_id: null,
    supplier: "",
    item_name: "",
    quantity: 0,
    unit: "unit",
    estimated_cost: 0,
    status: "requested",
    requested_at: null,
    approved_at: null,
    received_at: null,
  });
  const [laborForm, setLaborForm] = useState<Omit<LaborAttendanceItem, "id">>({
    outlet_id: null,
    employee_name: "",
    shift_start: nowLocal(),
    shift_end: null,
    clock_in_at: null,
    clock_out_at: null,
    status: "scheduled",
    note: null,
  });
  const [supportForm, setSupportForm] = useState<Omit<SupportItem, "id">>({
    category: "onboarding",
    title: "",
    owner: null,
    status: "open",
    priority: "medium",
    due_at: null,
    health_score: null,
    sla_hours: null,
    note: null,
  });

  const summaryQuery = useQuery({
    queryKey: ["enterprise-summary"],
    queryFn: getEnterpriseSummary,
    retry: false,
  });
  const inventoryQuery = useQuery({
    queryKey: ["enterprise-inventory"],
    queryFn: () => listEnterpriseItems<InventoryCountItem>("inventory"),
    retry: false,
  });
  const purchaseQuery = useQuery({
    queryKey: ["enterprise-purchase"],
    queryFn: () => listEnterpriseItems<PurchaseRequestItem>("purchase"),
    retry: false,
  });
  const laborQuery = useQuery({
    queryKey: ["enterprise-labor"],
    queryFn: () => listEnterpriseItems<LaborAttendanceItem>("labor"),
    retry: false,
  });
  const supportQuery = useQuery({
    queryKey: ["enterprise-support"],
    queryFn: () => listEnterpriseItems<SupportItem>("support"),
    retry: false,
  });

  async function refreshAll() {
    await Promise.all([
      summaryQuery.refetch(),
      inventoryQuery.refetch(),
      purchaseQuery.refetch(),
      laborQuery.refetch(),
      supportQuery.refetch(),
    ]);
  }

  async function saveInventory() {
    if (!inventoryForm.item_name.trim()) return;
    await createEnterpriseItem<InventoryCountItem>("inventory", {
      ...inventoryForm,
      item_name: inventoryForm.item_name.trim(),
      outlet_id: inventoryForm.outlet_id?.trim() || null,
      reason: inventoryForm.reason?.trim() || null,
      counted_at: inventoryForm.counted_at || new Date().toISOString(),
    });
    setInventoryForm((current) => ({
      ...current,
      item_name: "",
      expected_quantity: 0,
      actual_quantity: 0,
      unit_cost: 0,
      reason: null,
    }));
    await refreshAll();
  }

  async function savePurchase() {
    if (!purchaseForm.supplier.trim() || !purchaseForm.item_name.trim()) return;
    await createEnterpriseItem<PurchaseRequestItem>("purchase", {
      ...purchaseForm,
      supplier: purchaseForm.supplier.trim(),
      item_name: purchaseForm.item_name.trim(),
      outlet_id: purchaseForm.outlet_id?.trim() || null,
      requested_at: purchaseForm.requested_at || new Date().toISOString(),
    });
    setPurchaseForm((current) => ({
      ...current,
      supplier: "",
      item_name: "",
      quantity: 0,
      estimated_cost: 0,
    }));
    await refreshAll();
  }

  async function saveLabor() {
    if (!laborForm.employee_name.trim()) return;
    await createEnterpriseItem<LaborAttendanceItem>("labor", {
      ...laborForm,
      employee_name: laborForm.employee_name.trim(),
      outlet_id: laborForm.outlet_id?.trim() || null,
      shift_start: new Date(laborForm.shift_start).toISOString(),
      shift_end: laborForm.shift_end ? new Date(laborForm.shift_end).toISOString() : null,
      clock_in_at: laborForm.clock_in_at ? new Date(laborForm.clock_in_at).toISOString() : null,
      clock_out_at: laborForm.clock_out_at ? new Date(laborForm.clock_out_at).toISOString() : null,
    });
    setLaborForm((current) => ({ ...current, employee_name: "", status: "scheduled", note: null }));
    await refreshAll();
  }

  async function saveSupport() {
    if (!supportForm.title.trim()) return;
    await createEnterpriseItem<SupportItem>("support", {
      ...supportForm,
      title: supportForm.title.trim(),
      owner: supportForm.owner?.trim() || null,
      note: supportForm.note?.trim() || null,
      due_at: supportForm.due_at ? new Date(supportForm.due_at).toISOString() : null,
    });
    setSupportForm((current) => ({ ...current, title: "", note: null }));
    await refreshAll();
  }

  async function runBatteryAlerts() {
    const result = await processBatteryAlerts();
    setMessage(
      `Battery alerts: ${result.created_tasks} task dibuat, ${result.notifications_sent} notif dikirim.`
    );
  }

  const summary = summaryQuery.data;
  const inventoryRows = inventoryQuery.data ?? [];
  const purchaseRows = purchaseQuery.data ?? [];
  const laborRows = laborQuery.data ?? [];
  const supportRows = supportQuery.data ?? [];
  const summaryCards: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: "Shrink", value: summary?.shrink_value ?? 0, icon: PackageCheck },
    { label: "Waste", value: summary?.waste_value ?? 0, icon: PackageCheck },
    { label: "Open PO", value: summary?.open_purchase_requests ?? 0, icon: ShoppingCart },
    {
      label: "Late/Missed",
      value: `${summary?.late_attendance ?? 0}/${summary?.missed_attendance ?? 0}`,
      icon: Users,
    },
    { label: "CS Health", value: summary?.average_health_score ?? "-", icon: ClipboardCheck },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Crunchtime Enterprise</p>
          <h1 className="text-2xl font-semibold text-slate-950">Enterprise Suite</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Inventory variance, purchase workflow, labor attendance, support rollout, and sensor
            battery automation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runBatteryAlerts()}
          className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white"
        >
          <BatteryWarning className="size-4" />
          Process battery alerts
        </button>
      </div>
      {message ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Icon className="size-4" />
              <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Inventory Count & Variance">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={inventoryForm.item_name}
              placeholder="Item name"
              onChange={(value) => setInventoryForm((form) => ({ ...form, item_name: value }))}
            />
            <Input
              value={inventoryForm.outlet_id ?? ""}
              placeholder="Outlet ID"
              onChange={(value) =>
                setInventoryForm((form) => ({ ...form, outlet_id: value || null }))
              }
            />
            <NumberInput
              value={inventoryForm.expected_quantity}
              placeholder="Expected"
              onChange={(value) =>
                setInventoryForm((form) => ({ ...form, expected_quantity: value }))
              }
            />
            <NumberInput
              value={inventoryForm.actual_quantity}
              placeholder="Actual"
              onChange={(value) =>
                setInventoryForm((form) => ({ ...form, actual_quantity: value }))
              }
            />
            <NumberInput
              value={inventoryForm.unit_cost}
              placeholder="Unit cost"
              onChange={(value) => setInventoryForm((form) => ({ ...form, unit_cost: value }))}
            />
            <Input
              value={inventoryForm.reason ?? ""}
              placeholder="Reason shrink/waste"
              onChange={(value) => setInventoryForm((form) => ({ ...form, reason: value || null }))}
            />
          </div>
          <SaveButton onClick={saveInventory} />
          <MiniTable
            rows={inventoryRows
              .slice(0, 5)
              .map((row) => [
                row.item_name,
                `${row.actual_quantity}/${row.expected_quantity} ${row.unit}`,
                row.reason ?? "-",
              ])}
          />
        </Panel>

        <Panel title="Supplier Purchase Workflow">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={purchaseForm.supplier}
              placeholder="Supplier"
              onChange={(value) => setPurchaseForm((form) => ({ ...form, supplier: value }))}
            />
            <Input
              value={purchaseForm.item_name}
              placeholder="Item name"
              onChange={(value) => setPurchaseForm((form) => ({ ...form, item_name: value }))}
            />
            <NumberInput
              value={purchaseForm.quantity}
              placeholder="Quantity"
              onChange={(value) => setPurchaseForm((form) => ({ ...form, quantity: value }))}
            />
            <NumberInput
              value={purchaseForm.estimated_cost}
              placeholder="Estimated cost"
              onChange={(value) => setPurchaseForm((form) => ({ ...form, estimated_cost: value }))}
            />
            <Select
              value={purchaseForm.status}
              options={["requested", "approved", "ordered", "received", "cancelled"]}
              onChange={(value) => setPurchaseForm((form) => ({ ...form, status: value }))}
            />
          </div>
          <SaveButton onClick={savePurchase} />
          <MiniTable
            rows={purchaseRows.slice(0, 5).map((row) => [row.supplier, row.item_name, row.status])}
          />
        </Panel>

        <Panel title="Labor Attendance">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={laborForm.employee_name}
              placeholder="Employee"
              onChange={(value) => setLaborForm((form) => ({ ...form, employee_name: value }))}
            />
            <input
              type="datetime-local"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={laborForm.shift_start}
              onChange={(event) =>
                setLaborForm((form) => ({ ...form, shift_start: event.target.value }))
              }
            />
            <input
              type="datetime-local"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={laborForm.clock_in_at ?? ""}
              onChange={(event) =>
                setLaborForm((form) => ({ ...form, clock_in_at: event.target.value || null }))
              }
            />
            <Select
              value={laborForm.status}
              options={["scheduled", "clocked_in", "completed", "late", "missed"]}
              onChange={(value) => setLaborForm((form) => ({ ...form, status: value }))}
            />
          </div>
          <SaveButton onClick={saveLabor} />
          <MiniTable
            rows={laborRows
              .slice(0, 5)
              .map((row) => [
                row.employee_name,
                row.status,
                new Date(row.shift_start).toLocaleString(),
              ])}
          />
        </Panel>

        <Panel title="Onboarding & Support">
          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={supportForm.category}
              options={[
                "onboarding",
                "customer_success",
                "benchmark",
                "integration",
                "support_ticket",
              ]}
              onChange={(value) => setSupportForm((form) => ({ ...form, category: value }))}
            />
            <Input
              value={supportForm.title}
              placeholder="Title"
              onChange={(value) => setSupportForm((form) => ({ ...form, title: value }))}
            />
            <Input
              value={supportForm.owner ?? ""}
              placeholder="Owner"
              onChange={(value) => setSupportForm((form) => ({ ...form, owner: value || null }))}
            />
            <NumberInput
              value={supportForm.health_score ?? 0}
              placeholder="Health score"
              onChange={(value) => setSupportForm((form) => ({ ...form, health_score: value }))}
            />
            <Select
              value={supportForm.status}
              options={["open", "in_progress", "at_risk", "closed"]}
              onChange={(value) => setSupportForm((form) => ({ ...form, status: value }))}
            />
            <Input
              value={supportForm.note ?? ""}
              placeholder="Note"
              onChange={(value) => setSupportForm((form) => ({ ...form, note: value || null }))}
            />
          </div>
          <SaveButton onClick={saveSupport} />
          <MiniTable
            rows={supportRows.slice(0, 5).map((row) => [row.category, row.title, row.status])}
          />
        </Panel>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function Input({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberInput({
  value,
  placeholder,
  onChange,
}: {
  value: number;
  placeholder: string;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SaveButton({ onClick }: { onClick: () => Promise<void> }) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
    >
      Save
    </button>
  );
}

function MiniTable({ rows }: { rows: Array<Array<string | number>> }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">Belum ada data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-2 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
