"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import {
  createIdentityUser,
  deactivateIdentityUser,
  getIdentityOutlets,
  getIdentityRoles,
  getIdentityUsers,
  IdentityOutlet,
  IdentityRole,
  IdentityUser,
  updateIdentityUser,
} from "@/services/identity.service";

import { emptyUserForm } from "../data/users-data";
import { OutletScope, User, UserFormState, UserRole, UserStatus } from "../types";

function getScopeByRole(role: UserRole): OutletScope {
  if (role === "Owner/Admin") return "All Outlets";
  if (role === "Area Manager") return "Multiple Outlets";
  return "Single Outlet";
}

function getRoleLabel(slug: string): UserRole {
  if (slug === "owner" || slug === "admin") return "Owner/Admin";
  if (slug === "area_manager") return "Area Manager";
  return "Outlet";
}

function getStatus(isActive: boolean): UserStatus {
  return isActive ? "Active" : "Suspended";
}

function mapIdentityUser(user: IdentityUser): User {
  const role = getRoleLabel(user.role.slug);
  const assignedOutletNames = user.assigned_outlets?.map((outlet) => outlet.name) ?? [];
  const assignedOutletIds = user.assigned_outlets?.map((outlet) => outlet.id) ?? [];

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role,
    outlet:
      role === "Owner/Admin"
        ? "All Outlets"
        : role === "Area Manager"
          ? assignedOutletNames.length
            ? assignedOutletNames.join(", ")
            : "No outlets assigned"
          : user.outlet?.name ?? "No outlet assigned",
    outletIds: role === "Area Manager" ? assignedOutletIds : [],
    outletScope: getScopeByRole(role),
    status: getStatus(user.is_active),
    lastActive: user.last_login ? new Date(user.last_login).toLocaleString() : "Never",
  };
}

function getRoleIdByFormRole(roles: IdentityRole[], role: UserRole) {
  const slug =
    role === "Owner/Admin" ? "owner" : role === "Area Manager" ? "area_manager" : "outlet";

  return roles.find((item) => item.slug === slug)?.id ?? "";
}

function getOutletIdByName(outlets: IdentityOutlet[], outletName: string) {
  return outlets.find((outlet) => outlet.name === outletName)?.id ?? null;
}

function makeUsername(email: string) {
  return email.split("@")[0]?.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") || "user";
}

export function useUsersWorkspace() {
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyUserForm);
  const [error, setError] = useState("");

  const usersQuery = useQuery({
    queryKey: queryKeys.identity.users,
    queryFn: getIdentityUsers,
  });

  const rolesQuery = useQuery({
    queryKey: queryKeys.identity.roles,
    queryFn: getIdentityRoles,
  });

  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
  });

  const identityUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const outlets = useMemo(() => outletsQuery.data ?? [], [outletsQuery.data]);

  const users = useMemo(() => identityUsers.map(mapIdentityUser), [identityUsers]);

  const metrics = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.status === "Active").length,
      pending: users.filter((user) => user.status === "Pending").length,
      suspended: users.filter((user) => user.status === "Suspended").length,
    };
  }, [users]);

  async function invalidateIdentityUsers() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.identity.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.identity.outlets });
  }

  const createMutation = useMutation({
    mutationFn: createIdentityUser,
    onSuccess: invalidateIdentityUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: Parameters<typeof updateIdentityUser>[1];
    }) => updateIdentityUser(userId, payload),
    onSuccess: invalidateIdentityUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateIdentityUser,
    onSuccess: invalidateIdentityUsers,
  });

  const loading =
    usersQuery.isLoading ||
    rolesQuery.isLoading ||
    outletsQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const queryError =
    usersQuery.error instanceof Error
      ? usersQuery.error.message
      : rolesQuery.error instanceof Error
        ? rolesQuery.error.message
        : outletsQuery.error instanceof Error
          ? outletsQuery.error.message
          : "";

  function openCreateDialog() {
    setEditingUserId(null);
    setForm(emptyUserForm);
    setError("");
    setModalOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      outlet:
        user.role === "Outlet"
          ? user.outlet
          : user.role === "Area Manager"
            ? "Multiple Outlets"
            : "All Outlets",
      outletIds: user.outletIds,
      outletScope: user.outletScope,
      status: user.status,
    });
    setError("");
    setModalOpen(true);
  }

  function resolveAccessPayload(normalizedForm: UserFormState) {
    if (normalizedForm.role === "Owner/Admin") {
      return {
        outlet_id: null,
        outlet_ids: [],
      };
    }

    if (normalizedForm.role === "Area Manager") {
      if (normalizedForm.outletIds.length === 0) {
        throw new Error("Area Manager must manage at least one outlet");
      }

      return {
        outlet_id: null,
        outlet_ids: normalizedForm.outletIds,
      };
    }

    const outletId = getOutletIdByName(outlets, normalizedForm.outlet);

    if (!outletId) {
      throw new Error("Outlet account must be assigned to one specific outlet");
    }

    return {
      outlet_id: outletId,
      outlet_ids: [],
    };
  }

  async function saveUser() {
    if (!form.name.trim() || !form.email.trim()) return;

    const roleId = getRoleIdByFormRole(roles, form.role);
    if (!roleId) {
      setError("Selected role is not available from backend");
      return;
    }

    const normalizedForm: UserFormState = {
      ...form,
      outletScope: getScopeByRole(form.role),
    };

    try {
      setError("");

      const accessPayload = resolveAccessPayload(normalizedForm);

      if (editingUserId) {
        await updateMutation.mutateAsync({
          userId: editingUserId,
          payload: {
            email: normalizedForm.email,
            full_name: normalizedForm.name,
            role_id: roleId,
            ...accessPayload,
            is_active: normalizedForm.status === "Active",
          },
        });
      } else {
        await createMutation.mutateAsync({
          email: normalizedForm.email,
          username: makeUsername(normalizedForm.email),
          full_name: normalizedForm.name,
          password: "User12345!",
          role_id: roleId,
          ...accessPayload,
          is_active: normalizedForm.status === "Active",
        });
      }

      setForm(emptyUserForm);
      setEditingUserId(null);
      setModalOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save user");
    }
  }

  async function deleteUser(id: string) {
    try {
      setError("");
      await deleteMutation.mutateAsync(id);
      if (selectedUser?.id === id) setSelectedUser(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to deactivate user");
    }
  }

  async function updateStatus(id: string, status: UserStatus) {
    try {
      setError("");
      await updateMutation.mutateAsync({
        userId: id,
        payload: {
          is_active: status === "Active",
        },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update status");
    }
  }

  return {
    users,
    roles,
    outlets,
    selectedUser,
    setSelectedUser,
    modalOpen,
    setModalOpen,
    editingUserId,
    form,
    setForm,
    metrics,
    loading,
    error: error || queryError,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.users }),
    openCreateDialog,
    openEditDialog,
    saveUser,
    deleteUser,
    updateStatus,
  };
}
