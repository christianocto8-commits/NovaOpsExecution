"use client";

import { Download, Plus } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { Button, PageHeader } from "@/shared/ui";
import { exportToCsv } from "@/shared/export/utils";

import { useOutletsWorkspace } from "../hooks";
import { OutletDetailDrawer } from "./outlet-detail-drawer";
import { OutletFormDialog } from "./outlet-form-dialog";
import { OutletMetrics } from "./outlet-metrics";
import { OutletTable } from "./outlet-table";

export function OutletsWorkspace() {
  const outletsWorkspace = useOutletsWorkspace();
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isOwnerAdminWorkspace = workspace.mode === "enterprise";
  const isAreaWorkspace = workspace.mode === "area";

  const territoryOptions = useMemo(() => {
    const areas = new Set(outletsWorkspace.outlets.map((outlet) => outlet.area).filter(Boolean));
    return Array.from(areas).sort((a, b) => a.localeCompare(b));
  }, [outletsWorkspace.outlets]);

  const filteredOutlets = useMemo(() => {
    if (territoryFilter === "all") return outletsWorkspace.outlets;
    return outletsWorkspace.outlets.filter((outlet) => outlet.area === territoryFilter);
  }, [outletsWorkspace.outlets, territoryFilter]);

  function handleBulkExport() {
    exportToCsv(
      filteredOutlets.map((outlet) => ({
        ID: outlet.id,
        Code: outlet.code,
        Outlet: outlet.name,
        Area: outlet.area,
        Tier: outlet.tier,
        Status: outlet.status,
        Compliance: outlet.compliance,
      })),
      "novaops-outlets-bulk"
    );
  }

  function handleCloseOutletForm() {
    outletsWorkspace.setOutletModalOpen(false);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Outlet Management"
        title="Enterprise Outlets"
        description={
          isAreaWorkspace
            ? "Area manager dapat melihat outlet dan status operasional tanpa mengubah struktur outlet."
            : "Manage outlet identity, operational accounts, compliance visibility, and outlet setup."
        }
        actions={
          isOwnerAdminWorkspace ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleBulkExport}
              >
                Bulk Export
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={outletsWorkspace.openCreateOutletDialog}
              >
                Add Outlet
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Read only for Area Manager
            </div>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTerritoryFilter("all")}
          className={`rounded-full px-4 py-2 text-xs font-bold ${
            territoryFilter === "all"
              ? "bg-emerald-700 text-white"
              : "border border-slate-200 bg-white text-slate-600"
          }`}
        >
          All territories
        </button>
        {territoryOptions.map((area) => (
          <button
            key={area}
            type="button"
            onClick={() => setTerritoryFilter(area)}
            className={`rounded-full px-4 py-2 text-xs font-bold ${
              territoryFilter === area
                ? "bg-emerald-700 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      <OutletMetrics
        total={outletsWorkspace.metrics.total}
        online={outletsWorkspace.metrics.online}
        review={outletsWorkspace.metrics.review}
        offline={outletsWorkspace.metrics.offline}
      />

      {outletsWorkspace.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {outletsWorkspace.error}
        </div>
      ) : null}

      <OutletTable
        outlets={filteredOutlets}
        onSelectOutlet={outletsWorkspace.setSelectedOutlet}
        onEditOutlet={outletsWorkspace.openEditOutletDialog}
        onDeleteOutlet={outletsWorkspace.deleteOutlet}
        onStatusChange={outletsWorkspace.updateOutletStatus}
        canManage={isOwnerAdminWorkspace}
      />

      {isOwnerAdminWorkspace ? (
        <>
          <OutletFormDialog
            open={outletsWorkspace.outletModalOpen}
            editingOutletId={outletsWorkspace.editingOutletId}
            form={outletsWorkspace.outletForm}
            onClose={handleCloseOutletForm}
            onFormChange={outletsWorkspace.setOutletForm}
            onSave={outletsWorkspace.saveOutlet}
          />
        </>
      ) : null}

      <OutletDetailDrawer
        outlet={outletsWorkspace.selectedOutlet}
        onClose={() => outletsWorkspace.setSelectedOutlet(null)}
      />
    </main>
  );
}
