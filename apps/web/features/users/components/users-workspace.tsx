"use client";

import { Plus } from "lucide-react";

import { Button, PageHeader } from "@/shared/ui";

import { useUsersWorkspace } from "../hooks";
import { UserDetailDrawer } from "./user-detail-drawer";
import { UserFormDialog } from "./user-form-dialog";
import { UserMetrics } from "./user-metrics";
import { UserTable } from "./user-table";

export function UsersWorkspace() {
  const usersWorkspace = useUsersWorkspace();

  function handleCloseForm() {
    usersWorkspace.setModalOpen(false);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Account Management"
        title="Enterprise Accounts"
        description="Manage Owner/Admin, Area Manager, and Outlet accounts with locked outlet-based RBAC."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={usersWorkspace.openCreateDialog}
          >
            Create Account
          </Button>
        }
      />

      <UserMetrics
        total={usersWorkspace.metrics.total}
        active={usersWorkspace.metrics.active}
        pending={usersWorkspace.metrics.pending}
        suspended={usersWorkspace.metrics.suspended}
      />

      <UserTable
        users={usersWorkspace.users}
        onSelectUser={usersWorkspace.setSelectedUser}
        onEditUser={usersWorkspace.openEditDialog}
        onDeleteUser={usersWorkspace.deleteUser}
        onStatusChange={usersWorkspace.updateStatus}
      />

      <UserFormDialog
        open={usersWorkspace.modalOpen}
        editingUserId={usersWorkspace.editingUserId}
        form={usersWorkspace.form}
        onClose={handleCloseForm}
        onFormChange={usersWorkspace.setForm}
        onSave={usersWorkspace.saveUser}
      />

      <UserDetailDrawer
        user={usersWorkspace.selectedUser}
        onClose={() => usersWorkspace.setSelectedUser(null)}
      />
    </main>
  );
}
