"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { useDeleteAction, useStatusAction } from "@/shared/actions";
import { useToast } from "@/shared/toast";
import {
  createIdentityOutlet,
  createIdentityOutletOperator,
  deactivateIdentityOutlet,
  deleteIdentityOutletOperator,
  getIdentityOutletMetrics,
  getIdentityOutletOperators,
  getIdentityOutlets,
  IdentityOutlet,
  IdentityOutletMetrics,
  IdentityOutletOperator,
  updateIdentityOutlet,
  updateIdentityOutletOperator,
} from "@/services/identity.service";

import {
  emptyOperatorForm,
  emptyOutletForm,
} from "../data/outlets-data";
import { OperatorFormState, Outlet, OutletFormState, OutletOperator, OutletStatus } from "../types";

function toUiStatus(status: string): OutletStatus {
  if (status === "inactive") return "Offline";
  if (status === "review") return "Review";
  return "Online";
}

function toApiStatus(status: OutletStatus) {
  if (status === "Offline") return "inactive";
  if (status === "Review") return "review";
  return "active";
}

function mapIdentityOperator(operator: IdentityOutletOperator): OutletOperator {
  return {
    id: operator.id,
    outletId: operator.outlet_id,
    name: operator.name,
    position: operator.position as OutletOperator["position"],
    pin: "",
    active: operator.is_active,
  };
}

function formatLastAudit(value: string | null) {
  if (!value) return "Not audited";

  return new Date(value).toLocaleString();
}

function mapIdentityOutlet(
  outlet: IdentityOutlet,
  metrics?: IdentityOutletMetrics
): Outlet {
  return {
    id: outlet.id,
    code: outlet.code,
    name: outlet.name,
    area: outlet.address ?? "",
    phone: outlet.phone ?? "",
    status: toUiStatus(outlet.status),
    tier: "Standard",
    compliance: `${Math.round(metrics?.compliance ?? 0)}%`,
    openTasks: metrics?.open_tasks ?? 0,
    lastAudit: formatLastAudit(metrics?.last_audit ?? null),
  };
}

function makeOutletCode(value: string) {
  return (
    value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
  );
}

export function useOutletsWorkspace() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const [outletModalOpen, setOutletModalOpen] = useState(false);
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [outletForm, setOutletForm] = useState<OutletFormState>(emptyOutletForm);

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [operatorForm, setOperatorForm] = useState<OperatorFormState>(emptyOperatorForm);

  const [error, setError] = useState("");

  const outletsQuery = useQuery({
    queryKey: queryKeys.identity.outlets,
    queryFn: getIdentityOutlets,
  });

  const operatorsQuery = useQuery({
    queryKey: queryKeys.identity.operators,
    queryFn: () => getIdentityOutletOperators(),
  });

  const outletMetricsQuery = useQuery({
    queryKey: queryKeys.identity.outletMetrics,
    queryFn: getIdentityOutletMetrics,
  });

  const identityOutlets = outletsQuery.data ?? [];
  const identityOperators = operatorsQuery.data ?? [];
  const outletMetrics = outletMetricsQuery.data ?? [];

  const metricsByOutletId = useMemo(() => {
    return new Map(outletMetrics.map((item) => [item.outlet_id, item]));
  }, [outletMetrics]);

  const outlets = useMemo(
    () =>
      identityOutlets.map((outlet) =>
        mapIdentityOutlet(outlet, metricsByOutletId.get(outlet.id))
      ),
    [identityOutlets, metricsByOutletId]
  );
  const operators = useMemo(
    () => identityOperators.map(mapIdentityOperator),
    [identityOperators]
  );

  const metrics = useMemo(() => {
    return {
      total: outlets.length,
      online: outlets.filter((outlet) => outlet.status === "Online").length,
      review: outlets.filter((outlet) => outlet.status === "Review").length,
      offline: outlets.filter((outlet) => outlet.status === "Offline").length,
    };
  }, [outlets]);

  const selectedOutletOperators = useMemo(() => {
    if (!selectedOutlet) return [];
    return operators.filter((operator) => operator.outletId === selectedOutlet.id);
  }, [operators, selectedOutlet]);

  async function invalidateOutlets() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.identity.outlets });
    await queryClient.invalidateQueries({ queryKey: queryKeys.identity.operators });
    await queryClient.invalidateQueries({ queryKey: queryKeys.identity.outletMetrics });
  }

  const createMutation = useMutation({
    mutationFn: createIdentityOutlet,
    onSuccess: invalidateOutlets,
  });

  const updateMutation = useMutation({
    mutationFn: ({ outletId, payload }: { outletId: string; payload: Parameters<typeof updateIdentityOutlet>[1] }) =>
      updateIdentityOutlet(outletId, payload),
    onSuccess: invalidateOutlets,
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateIdentityOutlet,
    onSuccess: invalidateOutlets,
  });

  const createOperatorMutation = useMutation({
    mutationFn: createIdentityOutletOperator,
    onSuccess: invalidateOutlets,
  });

  const updateOperatorMutation = useMutation({
    mutationFn: ({
      operatorId,
      payload,
    }: {
      operatorId: string;
      payload: Parameters<typeof updateIdentityOutletOperator>[1];
    }) => updateIdentityOutletOperator(operatorId, payload),
    onSuccess: invalidateOutlets,
  });

  const deleteOperatorMutation = useMutation({
    mutationFn: deleteIdentityOutletOperator,
    onSuccess: invalidateOutlets,
  });

  const loading =
    outletsQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    operatorsQuery.isLoading ||
    outletMetricsQuery.isLoading;

  const queryError =
    outletsQuery.error instanceof Error
      ? outletsQuery.error.message
      : operatorsQuery.error instanceof Error
        ? operatorsQuery.error.message
        : outletMetricsQuery.error instanceof Error
          ? outletMetricsQuery.error.message
          : "";

  function openCreateOutletDialog() {
    setEditingOutletId(null);
    setOutletForm(emptyOutletForm);
    setError("");
    setOutletModalOpen(true);
  }

  function openEditOutletDialog(outlet: Outlet) {
    setEditingOutletId(outlet.id);
    setOutletForm({
      code: outlet.code,
      name: outlet.name,
      area: outlet.area,
      phone: outlet.phone,
      status: outlet.status,
      tier: outlet.tier,
    });
    setError("");
    setOutletModalOpen(true);
  }

  async function saveOutlet() {
    const code = makeOutletCode(outletForm.code || outletForm.name);
    const name = outletForm.name.trim();

    if (!code || code.length < 2) {
      setError("Outlet code must be at least 2 characters");
      return;
    }

    if (!name) {
      setError("Outlet name is required");
      return;
    }

    try {
      setError("");

      if (editingOutletId) {
        await updateMutation.mutateAsync({
          outletId: editingOutletId,
          payload: {
            code,
            name,
            address: outletForm.area.trim() || null,
            phone: outletForm.phone.trim() || null,
            status: toApiStatus(outletForm.status),
          },
        });
      } else {
        await createMutation.mutateAsync({
          code,
          name,
          address: outletForm.area.trim() || null,
          phone: outletForm.phone.trim() || null,
          status: toApiStatus(outletForm.status),
        });
      }

      toast.success(editingOutletId ? "Outlet updated successfully." : "Outlet created successfully.");

      setOutletForm(emptyOutletForm);
      setEditingOutletId(null);
      setOutletModalOpen(false);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Failed to save outlet";
      setError(message);
      toast.error(message);
    }
  }

  const statusAction = useStatusAction<string, OutletStatus>({
    entityName: "Outlet",
    getSuccessMessage: () => "Outlet status updated successfully.",
    errorMessage: "Failed to update outlet status",
    onStatusChange: async (id, status) => {
      setError("");

      await updateMutation.mutateAsync({
        outletId: id,
        payload: { status: toApiStatus(status) },
      });
    },
  });

  const updateOutletStatus = statusAction.updateStatus;

  const deleteOutlet = useDeleteAction<string>({
    entityName: "Outlet",
    actionName: "Deactivate",
    getEntityLabel: (id) => outlets.find((item) => item.id === id)?.name,
    confirmationDescription: (label) =>
      `Are you sure you want to deactivate ${label}?\n\nThe outlet will be removed from active operations, but historical records will remain available.`,
    confirmText: "Deactivate",
    loadingText: "Deactivating...",
    successMessage: "Outlet deactivated successfully.",
    errorMessage: "Failed to deactivate outlet",
    onDelete: async (id) => {
      setError("");
      await deleteMutation.mutateAsync(id);
    },
    onAfterDelete: (id) => {
      if (selectedOutlet?.id === id) {
        setSelectedOutlet(null);
      }
    },
  }).deleteItem;

  function openCreateOperatorDialog(outletId: string) {
    setEditingOperatorId(null);
    setOperatorForm({ ...emptyOperatorForm, outletId });
    setOperatorModalOpen(true);
  }

  function openEditOperatorDialog(operator: OutletOperator) {
    setEditingOperatorId(operator.id);
    setOperatorForm({
      outletId: operator.outletId,
      name: operator.name,
      position: operator.position,
      pin: operator.pin,
      active: operator.active,
    });
    setOperatorModalOpen(true);
  }

  async function saveOperator() {
    if (!operatorForm.outletId || !operatorForm.name.trim()) return;

    try {
      setError("");

      if (editingOperatorId) {
        const payload: {
          outlet_id: string;
          name: string;
          position: string;
          pin?: string;
          is_active: boolean;
        } = {
          outlet_id: operatorForm.outletId,
          name: operatorForm.name,
          position: operatorForm.position,
          is_active: operatorForm.active,
        };
        if (operatorForm.pin.trim()) payload.pin = operatorForm.pin;
        await updateOperatorMutation.mutateAsync({
          operatorId: editingOperatorId,
          payload,
        });
      } else {
        await createOperatorMutation.mutateAsync({
          outlet_id: operatorForm.outletId,
          name: operatorForm.name,
          position: operatorForm.position,
          pin: operatorForm.pin,
          is_active: operatorForm.active,
        });
      }

      toast.success(
        editingOperatorId
          ? "Operator updated successfully."
          : "Operator created successfully."
      );

      setOperatorForm(emptyOperatorForm);
      setEditingOperatorId(null);
      setOperatorModalOpen(false);
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Failed to save operator";
      setError(message);
      toast.error(message);
    }
  }

  const deleteOperator = useDeleteAction<string>({
    entityName: "Operator",
    getEntityLabel: (id) => operators.find((item) => item.id === id)?.name,
    confirmationDescription: (label) =>
      `Are you sure you want to delete ${label}?\n\nThis operator will no longer be available for task execution audit selection.`,
    confirmText: "Delete",
    loadingText: "Deleting...",
    successMessage: "Operator deleted successfully.",
    errorMessage: "Failed to delete operator",
    onDelete: async (id) => {
      await deleteOperatorMutation.mutateAsync(id);
    },
  }).deleteItem;

  return {
    outlets,
    operators,
    selectedOutlet,
    setSelectedOutlet,
    selectedOutletOperators,
    metrics,
    loading,
    error: error || queryError,
    refresh: invalidateOutlets,

    outletModalOpen,
    setOutletModalOpen,
    editingOutletId,
    outletForm,
    setOutletForm,
    openCreateOutletDialog,
    openEditOutletDialog,
    saveOutlet,
    updateOutletStatus,
    deleteOutlet,

    operatorModalOpen,
    setOperatorModalOpen,
    editingOperatorId,
    operatorForm,
    setOperatorForm,
    openCreateOperatorDialog,
    openEditOperatorDialog,
    saveOperator,
    deleteOperator,
  };
}






