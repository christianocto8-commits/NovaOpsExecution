"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { useDeleteAction, useStatusAction } from "@/shared/actions";
import { useToast } from "@/shared/toast";
import {
  createIdentityUser,
  deleteIdentityUser,
  getIdentityOutlets,
  getIdentityRoles,
  getIdentityUsers,
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
  const outletIds = role === "Outlet" && user.outlet?.id ? [user.outlet.id] : assignedOutletIds;

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    username: user.username,
    role,
    outlet:
      role === "Owner/Admin"
        ? "All Outlets"
        : role === "Area Manager"
          ? assignedOutletNames.length
            ? assignedOutletNames.join(", ")
            : "No outlets assigned"
          : (user.outlet?.name ?? "No outlet assigned"),
    outletIds,
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

export function useUsersWorkspace() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
    mutationFn: deleteIdentityUser,
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
    setForm({
      ...emptyUserForm,
      outlet: outlets[0]?.id ?? "",
      status: "Active",
    });
    setError("");
    setModalOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUserId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "",
      role: user.role,
      outlet:
        user.role === "Outlet"
          ? (user.outletIds[0] ?? "")
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

    const outletId = normalizedForm.outlet;

    if (!outletId || !outlets.some((outlet) => outlet.id === outletId)) {
      throw new Error("Outlet account must be assigned to one specific outlet");
    }

    return {
      outlet_id: outletId,
      outlet_ids: [],
    };
  }

  async function saveUser() {
    if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
      setError("Name, email, and username are required");
      return;
    }

    if (!editingUserId && form.password.trim().length < 8) {
      setError("Initial password must be at least 8 characters");
      return;
    }

    if (editingUserId && form.password.trim().length > 0 && form.password.trim().length < 8) {
      setError("Reset password must be at least 8 characters");
      return;
    }

    const roleId = getRoleIdByFormRole(roles, form.role);
    if (!roleId) {
      setError("Selected role is not available from backend");
      return;
    }

    const normalizedForm: UserFormState = {
      ...form,
      email: form.email.trim().toLowerCase(),
      username: form.username.trim().toLowerCase(),
      password: form.password.trim(),
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
            username: normalizedForm.username,
            full_name: normalizedForm.name,
            ...(normalizedForm.password ? { password: normalizedForm.password } : {}),
            role_id: roleId,
            ...accessPayload,
            is_active: normalizedForm.status === "Active",
          },
        });
      } else {
        await createMutation.mutateAsync({
          email: normalizedForm.email,
          username: normalizedForm.username,
          full_name: normalizedForm.name,
          password: normalizedForm.password,
          role_id: roleId,
          ...accessPayload,
          is_active: normalizedForm.status === "Active",
        });
      }

      toast.success(
        editingUserId ? "Account updated successfully." : "Account created successfully."
      );

      setForm(emptyUserForm);
      setEditingUserId(null);
      setModalOpen(false);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to save user";
      setError(message);
      toast.error(message);
    }
  }

  const deleteUser = useDeleteAction<string>({
    entityName: "Account",
    actionName: "Delete",
    getEntityLabel: (id) => users.find((item) => item.id === id)?.name,
    confirmationDescription: (label) =>
      `Are you sure you want to delete ${label}?\n\nThis account will be removed from NovaOps. Use the Status field when you only want to suspend access.`,
    confirmText: "Delete",
    loadingText: "Deleting...",
    successMessage: "Account deleted successfully.",
    errorMessage: "Failed to delete account",
    onDelete: async (id) => {
      setError("");
      await deleteMutation.mutateAsync(id);
    },
    onAfterDelete: (id) => {
      if (selectedUser?.id === id) {
        setSelectedUser(null);
      }
    },
  }).deleteItem;

  const statusAction = useStatusAction<string, UserStatus>({
    entityName: "Account",
    getSuccessMessage: () => "Account status updated successfully.",
    errorMessage: "Failed to update status",
    onStatusChange: async (id, status) => {
      setError("");

      await updateMutation.mutateAsync({
        userId: id,
        payload: {
          is_active: status === "Active",
        },
      });
    },
  });

  const updateStatus = statusAction.updateStatus;

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
