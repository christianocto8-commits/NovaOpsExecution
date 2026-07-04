import { Edit3, Eye, Trash2 } from "lucide-react";

import { EnterpriseColumn, EnterpriseDataTable } from "@/shared/data-table";
import { ExportMenu } from "@/shared/export/components";
import {
  exportToCsv,
  exportToExcel,
  exportToPdf,
} from "@/shared/export/utils";

import { User, UserStatus } from "../types";
import { getUserRoleClass, getUserStatusClass } from "../utils";

type UserTableProps = {
  users: User[];
  onSelectUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onStatusChange: (id: string, status: UserStatus) => void;
};

const userFilterDefinitions = [
  {
    key: "role",
    label: "Role",
    type: "select",
    options: [
      { label: "Owner/Admin", value: "Owner/Admin" },
      { label: "Area Manager", value: "Area Manager" },
      { label: "Outlet", value: "Outlet" },
    ],
  },
  {
    key: "outletScope",
    label: "Outlet Scope",
    type: "select",
    options: [
      { label: "All Outlets", value: "All Outlets" },
      { label: "Multiple Outlets", value: "Multiple Outlets" },
      { label: "Single Outlet", value: "Single Outlet" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "Active" },
      { label: "Pending", value: "Pending" },
      { label: "Suspended", value: "Suspended" },
    ],
  },
  {
    key: "email",
    label: "Email",
    type: "text",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getExportRows(users: User[]) {
  return users.map((user) => ({
    ID: user.id,
    Account: user.name,
    Email: user.email,
    Role: user.role,
    "Outlet Access": user.outlet,
    Scope: user.outletScope,
    Status: user.status,
    "Last Active": user.lastActive,
  }));
}

export function UserTable({
  users,
  onSelectUser,
  onEditUser,
  onDeleteUser,
  onStatusChange,
}: UserTableProps) {
  const columns: EnterpriseColumn<User>[] = [
    {
      key: "name",
      header: "Account",
      sortable: true,
      render: (user) => (
        <button
          type="button"
          onClick={() => onSelectUser(user)}
          className="flex items-center gap-3 text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
            {getInitials(user.name)}
          </span>
          <span>
            <span className="block font-semibold text-slate-950">
              {user.name}
            </span>
            <span className="block text-xs text-slate-500">{user.email}</span>
          </span>
        </button>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (user) => (
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getUserRoleClass(
            user.role
          )}`}
        >
          {user.role}
        </span>
      ),
    },
    {
      key: "outletScope",
      header: "Scope",
      sortable: true,
    },
    {
      key: "outlet",
      header: "Outlet Access",
      sortable: true,
      render: (user) => (
        <span className="max-w-[260px] truncate text-sm text-slate-700">
          {user.outlet}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (user) => (
        <select
          value={user.status}
          onChange={(event) =>
            onStatusChange(user.id, event.target.value as UserStatus)
          }
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold outline-none ${getUserStatusClass(
            user.status
          )}`}
        >
          <option>Active</option>
          <option>Pending</option>
          <option>Suspended</option>
        </select>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      sortable: true,
    },
  ];

  const exportRows = getExportRows(users);

  return (
    <EnterpriseDataTable
      title="Enterprise Account Directory"
      description="Manage Owner/Admin, Area Manager, and Outlet operational accounts."
      columns={columns}
      data={users}
      getRowId={(user) => user.id}
      searchPlaceholder="Search account, email, role, outlet..."
      emptyTitle="No accounts found"
      emptyDescription="Try changing search or filter criteria."
      pageSize={10}
      defaultDensity="comfortable"
      enableFilters
      enableSavedViews
      savedViewScope="accounts-workspace"
      filterDefinitions={userFilterDefinitions}
      actions={
        <ExportMenu
          onCsvExport={() => exportToCsv(exportRows, "novaops-accounts")}
          onExcelExport={() => exportToExcel(exportRows, "novaops-accounts")}
          onPdfExport={() =>
            exportToPdf({
              title: "NovaOps Accounts",
              filename: "novaops-accounts",
              data: exportRows,
            })
          }
        />
      }
      rowActions={(user) => (
        <>
          <button
            onClick={() => onSelectUser(user)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>

          <button
            onClick={() => onEditUser(user)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>

          <button
            onClick={() => onDeleteUser(user.id)}
            className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    />
  );
}
