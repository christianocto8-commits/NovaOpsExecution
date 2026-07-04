"use client";

import { useMemo, useState } from "react";

import { emptyUserForm, mockUsers } from "../data/users-data";
import { OutletScope, User, UserFormState, UserStatus } from "../types";

function getScopeByRole(role: UserFormState["role"]): OutletScope {
  if (role === "Owner/Admin") return "All Outlets";
  if (role === "Area Manager") return "Multiple Outlets";
  return "Single Outlet";
}

export function useUsersWorkspace() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);

  const metrics = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.status === "Active").length,
      pending: users.filter((user) => user.status === "Pending").length,
      suspended: users.filter((user) => user.status === "Suspended").length,
    };
  }, [users]);

  function openCreateDialog() {
    setEditingUserId(null);
    setForm(emptyUserForm);
    setModalOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      outlet: user.outlet,
      outletScope: user.outletScope,
      status: user.status,
    });
    setModalOpen(true);
  }

  function saveUser() {
    if (!form.name.trim() || !form.email.trim()) return;

    const normalizedForm = {
      ...form,
      outletScope: getScopeByRole(form.role),
    };

    if (editingUserId) {
      setUsers((current) =>
        current.map((user) =>
          user.id === editingUserId
            ? {
                ...user,
                ...normalizedForm,
              }
            : user
        )
      );
    } else {
      const nextUser: User = {
        id: `ACC-${String(users.length + 1).padStart(3, "0")}`,
        ...normalizedForm,
        lastActive: "Invite pending",
      };

      setUsers((current) => [nextUser, ...current]);
    }

    setForm(emptyUserForm);
    setEditingUserId(null);
    setModalOpen(false);
  }

  function deleteUser(id: string) {
    setUsers((current) => current.filter((user) => user.id !== id));
    if (selectedUser?.id === id) setSelectedUser(null);
  }

  function updateStatus(id: string, status: UserStatus) {
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, status } : user))
    );
  }

  return {
    users,
    selectedUser,
    setSelectedUser,
    modalOpen,
    setModalOpen,
    editingUserId,
    form,
    setForm,
    metrics,
    openCreateDialog,
    openEditDialog,
    saveUser,
    deleteUser,
    updateStatus,
  };
}
