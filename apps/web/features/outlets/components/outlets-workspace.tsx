"use client";

import { Plus } from "lucide-react";

import { Button, PageHeader } from "@/shared/ui";

import { useOutletsWorkspace } from "../hooks";
import { OperatorFormDialog } from "./operator-form-dialog";
import { OutletDetailDrawer } from "./outlet-detail-drawer";
import { OutletFormDialog } from "./outlet-form-dialog";
import { OutletMetrics } from "./outlet-metrics";
import { OutletTable } from "./outlet-table";

export function OutletsWorkspace() {
  const outletsWorkspace = useOutletsWorkspace();

  function handleCloseOutletForm() {
    outletsWorkspace.setOutletModalOpen(false);
  }

  function handleCloseOperatorForm() {
    outletsWorkspace.setOperatorModalOpen(false);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Outlet Management"
        title="Enterprise Outlets"
        description="Manage outlet identity, operational accounts, compliance visibility, and outlet operators for task audit."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={outletsWorkspace.openCreateOutletDialog}
          >
            Add Outlet
          </Button>
        }
      />

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
        outlets={outletsWorkspace.outlets}
        onSelectOutlet={outletsWorkspace.setSelectedOutlet}
        onEditOutlet={outletsWorkspace.openEditOutletDialog}
        onDeleteOutlet={outletsWorkspace.deleteOutlet}
        onStatusChange={outletsWorkspace.updateOutletStatus}
      />

      <OutletFormDialog
        open={outletsWorkspace.outletModalOpen}
        editingOutletId={outletsWorkspace.editingOutletId}
        form={outletsWorkspace.outletForm}
        onClose={handleCloseOutletForm}
        onFormChange={outletsWorkspace.setOutletForm}
        onSave={outletsWorkspace.saveOutlet}
      />

      <OperatorFormDialog
        open={outletsWorkspace.operatorModalOpen}
        editingOperatorId={outletsWorkspace.editingOperatorId}
        form={outletsWorkspace.operatorForm}
        outlets={outletsWorkspace.outlets}
        onClose={handleCloseOperatorForm}
        onFormChange={outletsWorkspace.setOperatorForm}
        onSave={outletsWorkspace.saveOperator}
      />

      <OutletDetailDrawer
        outlet={outletsWorkspace.selectedOutlet}
        operators={outletsWorkspace.selectedOutletOperators}
        onClose={() => outletsWorkspace.setSelectedOutlet(null)}
        onAddOperator={outletsWorkspace.openCreateOperatorDialog}
        onEditOperator={outletsWorkspace.openEditOperatorDialog}
        onDeleteOperator={outletsWorkspace.deleteOperator}
      />
    </main>
  );
}
