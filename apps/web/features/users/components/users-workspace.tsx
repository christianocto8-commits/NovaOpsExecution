"use client";

import { useMemo, useState } from "react";

import { users, UserRow, UserStatus } from "../data/users-data";
import { StatCard, SectionCard } from "@/shared/ui/cards";
import { DataTable, DataTableColumn, Pagination } from "@/shared/ui/data-display";
import { FilterBar, SearchBar } from "@/shared/ui/filters";
import { Drawer } from "@/shared/ui/overlay";
import { Avatar, Badge, Button, Divider, Input } from "@/shared/ui/primitives";

function getStatusVariant(status: UserStatus) {
  if (status === "Active") return "success";
  if (status === "Pending") return "warning";
  return "danger";
}

export function UsersWorkspace() {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();

    return users.filter((user) => {
      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.role.toLowerCase().includes(keyword) ||
        user.outlet.toLowerCase().includes(keyword) ||
        user.status.toLowerCase().includes(keyword)
      );
    });
  }, [search]);

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "user",
      header: "User",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setSelectedUser(row)}
          className="flex items-center gap-3 text-left"
        >
          <Avatar name={row.name} size="sm" />
          <div>
            <div className="font-semibold text-[#1E1E1E]">{row.name}</div>
            <div className="text-xs text-gray-500">{row.email}</div>
          </div>
        </button>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <Badge variant="primary">{row.role}</Badge>,
    },
    {
      key: "outlet",
      header: "Outlet",
      cell: (row) => row.outlet,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "lastActive",
      header: "Last Active",
      cell: (row) => row.lastActive,
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedUser(row)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={users.length} description="Registered enterprise users" trend="Stable" />
        <StatCard title="Active Users" value={users.filter((u) => u.status === "Active").length} description="Currently enabled accounts" trend="Healthy" />
        <StatCard title="Pending Invites" value={users.filter((u) => u.status === "Pending").length} description="Waiting for activation" trend="Needs follow-up" />
        <StatCard title="Roles" value="5" description="Owner, Admin, Manager, Supervisor, Crew" trend="RBAC ready" />
      </div>

      <SectionCard
        title="Enterprise User Directory"
        description="Search, filter, review, and manage user access across outlets."
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Import</Button>
            <Button variant="secondary">Export</Button>
            <Button>Create User</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <FilterBar>
            <div className="w-full sm:max-w-md">
              <SearchBar
                value={search}
                placeholder="Search user, email, role, outlet..."
                onChange={setSearch}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSearch("")}>
                Reset
              </Button>
              <Button variant="secondary">Role Filter</Button>
              <Button variant="secondary">Outlet Filter</Button>
            </div>
          </FilterBar>

          <DataTable
            columns={columns}
            data={filteredUsers}
            getRowKey={(row) => row.id}
            emptyTitle="No users found"
            emptyDescription="Try changing your search keyword."
          />

          <Pagination page={1} totalPages={1} onPageChange={() => {}} />
        </div>
      </SectionCard>

      <Drawer
        open={Boolean(selectedUser)}
        title={selectedUser?.name}
        description={selectedUser ? `${selectedUser.email} • ${selectedUser.role}` : undefined}
        onClose={() => setSelectedUser(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
            <Button>Edit User</Button>
          </div>
        }
      >
        {selectedUser ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selectedUser.name} size="lg" />
              <div>
                <div className="font-semibold text-[#1E1E1E]">
                  {selectedUser.name}
                </div>
                <div className="text-sm text-gray-500">{selectedUser.email}</div>
              </div>
            </div>

            <Divider />

            <div className="grid gap-4">
              <Input label="User ID" value={selectedUser.id} readOnly />
              <Input label="Role" value={selectedUser.role} readOnly />
              <Input label="Outlet Access" value={selectedUser.outlet} readOnly />
              <Input label="Status" value={selectedUser.status} readOnly />
              <Input label="Last Active" value={selectedUser.lastActive} readOnly />
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}