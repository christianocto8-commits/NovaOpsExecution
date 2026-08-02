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
  resetIdentityUserSecurity,
  syncSystemIdentityRoles,
  updateIdentityUser,
} from "@/services/identity.service";

import { emptyUserForm } from "../data/users-data";
import { OutletScope, User, UserFormState, UserRole, UserStatus } from "../types";

function getScopeByRole(role: UserRole): OutletScope {
  if (role === "Owner/Admin" || role === "Finance Head Office") return "All Outlets";
  if (
    role === "Regional Manager" ||
    role === "District Manager" ||
    role === "Area Manager" ||
    role === "Finance Outlet"
  ) {
    return "Multiple Outlets";
  }
  return "Single Outlet";
}

function getRoleLabel(slug: string): UserRole {
  if (slug === "owner" || slug === "admin") return "Owner/Admin";
  if (slug === "regional_manager") return "Regional Manager";
  if (slug === "district_manager") return "District Manager";
  if (slug === "area_manager") return "Area Manager";
  if (slug === "finance_head_office") return "Finance Head Office";
  if (slug === "finance") return "Finance Outlet";
  return "Outlet";
}

function isMultiOutletRole(role: UserRole) {
  return (
    role === "Regional Manager" ||
    role === "District Manager" ||
    role === "Area Manager" ||
    role === "Finance Outlet"
  );
}

function isAllOutletsRole(role: UserRole) {
  return role === "Owner/Admin" || role === "Finance Head Office";
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
    outlet: isAllOutletsRole(role)
      ? "All Outlets"
      : isMultiOutletRole(role)
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
    role === "Owner/Admin"
      ? "owner"
      : role === "Regional Manager"
        ? "regional_manager"
        : role === "District Manager"
          ? "district_manager"
          : role === "Area Manager"
            ? "area_manager"
            : role === "Finance Head Office"
              ? "finance_head_office"
              : role === "Finance Outlet"
                ? "finance"
                : "outlet";

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
    queryFn: async () => {
      const nextRoles = await getIdentityRoles();
      const requiredRoles = [
        "owner",
        "regional_manager",
        "district_manager",
        "area_manager",
        "finance",
        "outlet",
      ];
      if (requiredRoles.every((slug) => nextRoles.some((role) => role.slug === slug))) {
        return nextRoles;
      }
      try {
        return await syncSystemIdentityRoles();
      } catch {
        return nextRoles;
      }
    },
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

  const securityResetMutation = useMutation({
    mutationFn: resetIdentityUserSecurity,
    onSuccess: invalidateIdentityUsers,
  });

  const loading =
    usersQuery.isLoading ||
    rolesQuery.isLoading ||
    outletsQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    securityResetMutation.isPending;

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
      outlet: user.role === "Outlet"
        ? (user.outletIds[0] ?? "")
        : isMultiOutletRole(user.role)
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
    if (isAllOutletsRole(normalizedForm.role)) {
      return {
        outlet_id: null,
        outlet_ids: [],
      };
    }

    if (isMultiOutletRole(normalizedForm.role)) {
      if (normalizedForm.outletIds.length === 0) {
        throw new Error(`${normalizedForm.role} must manage at least one outlet`);
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

  const resetSecurity = useDeleteAction<string>({
    entityName: "Account security",
    actionName: "Reset",
    getEntityLabel: (id) => users.find((item) => item.id === id)?.name,
    confirmationDescription: (label) =>
      `Reset security for ${label}?\n\nAll active login devices will be eliminated and active OTP login challenges will be cancelled.`,
    confirmText: "Reset security",
    loadingText: "Resetting...",
    successMessage: "Security reset completed.",
    errorMessage: "Failed to reset account security",
    onDelete: async (id) => {
      setError("");
      const result = await securityResetMutation.mutateAsync(id);
      toast.success(result.message);
    },
  }).deleteItem;

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
    resetSecurity,
  };
}
