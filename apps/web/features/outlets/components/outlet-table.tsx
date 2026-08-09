import { Edit3, Eye, Trash2 } from "lucide-react";

import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import { ExportMenu } from "@/shared/export/components";
import { exportToCsv, exportToExcel, exportToPdf } from "@/shared/export/utils";

import { Outlet, OutletStatus } from "../types";
import { getOutletStatusClass, getOutletTierClass } from "../utils";

type OutletTableProps = {
  outlets: Outlet[];
  onSelectOutlet: (outlet: Outlet) => void;
  onEditOutlet: (outlet: Outlet) => void;
  onDeleteOutlet: (id: string) => void;
  onStatusChange: (id: string, status: OutletStatus) => void;
  canManage: boolean;
};

const outletFilterDefinitions = [
  {
    key: "area",
    label: "Area",
    type: "text" as const,
  },
  {
    key: "tier",
    label: "Tier",
    type: "select" as const,
    options: [
      { label: "Flagship", value: "Flagship" },
      { label: "Standard", value: "Standard" },
      { label: "Express", value: "Express" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { label: "Online", value: "Online" },
      { label: "Review", value: "Review" },
      { label: "Offline", value: "Offline" },
    ],
  },
  {
    key: "code",
    label: "Outlet Code",
    type: "text" as const,
  },
];

function getExportRows(outlets: Outlet[]) {
  return outlets.map((outlet) => ({
    ID: outlet.id,
    Code: outlet.code,
    Outlet: outlet.name,
    Area: outlet.area,
    Phone: outlet.phone,
    Tier: outlet.tier,
    Status: outlet.status,
    Compliance: outlet.compliance,
    "Open Tasks": outlet.openTasks,
    "Last Audit": outlet.lastAudit,
  }));
}

export function OutletTable({
  outlets,
  onSelectOutlet,
  onEditOutlet,
  onDeleteOutlet,
  onStatusChange,
  canManage,
}: OutletTableProps) {
  const columns: EnterpriseColumn<Outlet>[] = [
    {
      key: "name",
      header: "Outlet",
      sortable: true,
      render: (outlet) => (
        <button type="button" onClick={() => onSelectOutlet(outlet)} className="text-left">
          <span className="block font-semibold text-slate-950">{outlet.name}</span>
          <span className="block text-xs text-slate-500">
            {outlet.code} • {outlet.area || "No address"}
          </span>
        </button>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      sortable: true,
      render: (outlet) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getOutletTierClass(
            outlet.tier
          )}`}
        >
          {outlet.tier}
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
    },
    {
      key: "phone",
      header: "Phone",
      sortable: true,
      render: (outlet) => outlet.phone || "-",
    },
    {
      key: "compliance",
      header: "Compliance",
      sortable: true,
      render: (outlet) => (
        <span className="font-semibold text-emerald-800">{outlet.compliance}</span>
      ),
    },
    {
      key: "openTasks",
      header: "Open Tasks",
      sortable: true,
      align: "center",
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (outlet) =>
        canManage ? (
          <select
            value={outlet.status}
            onChange={(event) => onStatusChange(outlet.id, event.target.value as OutletStatus)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none ${getOutletStatusClass(
              outlet.status
            )}`}
          >
            <option>Online</option>
            <option>Review</option>
            <option>Offline</option>
          </select>
        ) : (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getOutletStatusClass(
              outlet.status
            )}`}
          >
            {outlet.status}
          </span>
        ),
    },
    {
      key: "lastAudit",
      header: "Last Audit",
      sortable: true,
    },
  ];

  const exportRows = getExportRows(outlets);

  return (
    <EnterpriseDataTable
      title="Outlet Network"
      description={
        canManage
          ? "Manage real outlet identity, operational status, and compliance visibility."
          : "Area manager dapat melihat outlet, compliance, dan status operasional tanpa mengubah struktur outlet."
      }
      columns={columns}
      data={outlets}
      getRowId={(outlet) => outlet.id}
      searchPlaceholder="Search outlet, code, area, phone..."
      emptyTitle="No outlets found"
      emptyDescription="Try changing search or filter criteria."
      pageSize={10}
      defaultDensity="comfortable"
      enableFilters
      enableSavedViews
      savedViewScope="outlets-workspace"
      filterDefinitions={outletFilterDefinitions}
      actions={
        <ExportMenu
          onCsvExport={() => exportToCsv(exportRows, "novaops-outlets")}
          onExcelExport={() => exportToExcel(exportRows, "novaops-outlets")}
          onPdfExport={() =>
            exportToPdf({
              title: "NovaOps Outlets",
              fileName: "novaops-outlets",
              rows: exportRows,
              columns: Object.keys(exportRows[0] ?? {}).map((key) => ({
                key: key as keyof (typeof exportRows)[number],
                label: key,
              })),
            })
          }
        />
      }
      rowActions={(outlet) =>
        canManage ? (
          <>
            <button
              onClick={() => onSelectOutlet(outlet)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              onClick={() => onEditOutlet(outlet)}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              onClick={() => onDeleteOutlet(outlet.id)}
              className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => onSelectOutlet(outlet)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
        )
      }
    />
  );
}
