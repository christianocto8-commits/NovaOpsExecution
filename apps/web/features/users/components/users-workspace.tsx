"use client";

import { Plus } from "lucide-react";

import { useConfirmation } from "@/shared/confirmation";
import { Button, PageHeader } from "@/shared/ui";

import { useUsersWorkspace } from "../hooks";
import { UserDetailDrawer } from "./user-detail-drawer";
import { UserFormDialog } from "./user-form-dialog";
import { UserMetrics } from "./user-metrics";
import { UserTable } from "./user-table";

export function UsersWorkspace() {
  const usersWorkspace = useUsersWorkspace();
  const confirm = useConfirmation();

  function handleCloseForm() {
    usersWorkspace.setModalOpen(false);
  }

  async function handleDeleteUser(id: string) {
    const user = usersWorkspace.users.find((item) => item.id === id);

    const confirmed = await confirm({
      title: "Delete Account",
      description: `Are you sure you want to delete ${
        user?.name ?? "this account"
      }?\n\nThis action cannot be undone.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    usersWorkspace.deleteUser(id);
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
        outletOptions={usersWorkspace.outlets.map((outlet) => ({ id: outlet.id, name: outlet.name }))}
        onSave={usersWorkspace.saveUser}
      />

      <UserDetailDrawer
        user={usersWorkspace.selectedUser}
        onClose={() => usersWorkspace.setSelectedUser(null)}
      />
    </main>
  );
}

