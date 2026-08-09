"use client";

import { Plus } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { Button, PageHeader } from "@/shared/ui";

import { useUsersWorkspace } from "../hooks";
import { UserDetailDrawer } from "./user-detail-drawer";
import { UserFormDialog } from "./user-form-dialog";
import { UserMetrics } from "./user-metrics";
import { UserTable } from "./user-table";

export function UsersWorkspace() {
  const usersWorkspace = useUsersWorkspace();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const isOwnerAdminWorkspace = workspace.mode === "enterprise";
  const isAreaWorkspace = workspace.mode === "area";

  function handleCloseForm() {
    usersWorkspace.setModalOpen(false);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Account Management"
        title="Enterprise Accounts"
        description={
          isAreaWorkspace
            ? "Area manager dapat melihat struktur akun operasional untuk koordinasi lapangan, tanpa mengubah akun organisasi."
            : "Manage Owner/Admin, Area Manager, and Outlet accounts with locked outlet-based RBAC."
        }
        actions={
          isOwnerAdminWorkspace ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={usersWorkspace.openCreateDialog}
            >
              Create Account
            </Button>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Read only for Area Manager
            </div>
          )
        }
      />

      <UserMetrics
        total={usersWorkspace.metrics.total}
        active={usersWorkspace.metrics.active}
        pending={usersWorkspace.metrics.pending}
        suspended={usersWorkspace.metrics.suspended}
      />

      {usersWorkspace.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {usersWorkspace.error}
        </div>
      ) : null}

      <UserTable
        users={usersWorkspace.users}
        onSelectUser={usersWorkspace.setSelectedUser}
        onEditUser={usersWorkspace.openEditDialog}
        onDeleteUser={usersWorkspace.deleteUser}
        onResetSecurity={usersWorkspace.resetSecurity}
        onStatusChange={usersWorkspace.updateStatus}
        canManage={isOwnerAdminWorkspace}
      />

      {isOwnerAdminWorkspace ? (
        <UserFormDialog
          open={usersWorkspace.modalOpen}
          editingUserId={usersWorkspace.editingUserId}
          form={usersWorkspace.form}
          onClose={handleCloseForm}
          onFormChange={usersWorkspace.setForm}
          outletOptions={usersWorkspace.outlets.map((outlet) => ({
            id: outlet.id,
            name: outlet.name,
          }))}
          onSave={usersWorkspace.saveUser}
        />
      ) : null}

      <UserDetailDrawer
        user={usersWorkspace.selectedUser}
        onClose={() => usersWorkspace.setSelectedUser(null)}
      />
    </main>
  );
}
