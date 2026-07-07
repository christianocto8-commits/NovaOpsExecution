"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { useConfirmation } from "@/shared/confirmation";
import {
  createIdentityOutlet,
  deactivateIdentityOutlet,
  getIdentityOutlets,
  IdentityOutlet,
  updateIdentityOutlet,
} from "@/services/identity.service";

import {
  emptyOperatorForm,
  emptyOutletForm,
  mockOutletOperators,
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

function mapIdentityOutlet(outlet: IdentityOutlet): Outlet {
  return {
    id: outlet.id,
    name: outlet.name,
    area: outlet.address ?? "-",
    status: toUiStatus(outlet.status),
    tier: "Standard",
    compliance: "0%",
    openTasks: 0,
    lastAudit: "Not audited",
    accountEmail: `${outlet.code.toLowerCase()}@novaops.local`,
  };
}

function makeOutletCode(name: string) {
  return (
    name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 12) || "OUTLET"
  );
}

export function useOutletsWorkspace() {
  const queryClient = useQueryClient();
  const confirm = useConfirmation();

  const [operators, setOperators] = useState<OutletOperator[]>(mockOutletOperators);
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

  const identityOutlets = outletsQuery.data ?? [];
  const outlets = useMemo(() => identityOutlets.map(mapIdentityOutlet), [identityOutlets]);

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

  function invalidateOutlets() {
    return queryClient.invalidateQueries({ queryKey: queryKeys.identity.outlets });
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

  const loading =
    outletsQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const queryError = outletsQuery.error instanceof Error ? outletsQuery.error.message : "";

  function openCreateOutletDialog() {
    setEditingOutletId(null);
    setOutletForm(emptyOutletForm);
    setError("");
    setOutletModalOpen(true);
  }

  function openEditOutletDialog(outlet: Outlet) {
    setEditingOutletId(outlet.id);
    setOutletForm({
      name: outlet.name,
      area: outlet.area,
      status: outlet.status,
      tier: outlet.tier,
      accountEmail: outlet.accountEmail,
    });
    setError("");
    setOutletModalOpen(true);
  }

  async function saveOutlet() {
    if (!outletForm.name.trim()) return;

    try {
      setError("");

      if (editingOutletId) {
        await updateMutation.mutateAsync({
          outletId: editingOutletId,
          payload: {
            name: outletForm.name,
            address: outletForm.area,
            status: toApiStatus(outletForm.status),
          },
        });
      } else {
        await createMutation.mutateAsync({
          code: makeOutletCode(outletForm.name),
          name: outletForm.name,
          address: outletForm.area,
          phone: null,
          status: toApiStatus(outletForm.status),
        });
      }

      setOutletForm(emptyOutletForm);
      setEditingOutletId(null);
      setOutletModalOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save outlet");
    }
  }

  async function updateOutletStatus(id: string, status: OutletStatus) {
    try {
      setError("");
      await updateMutation.mutateAsync({
        outletId: id,
        payload: { status: toApiStatus(status) },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update outlet status");
    }
  }

  async function deleteOutlet(id: string) {
    const outlet = outlets.find((item) => item.id === id);

    const confirmed = await confirm({
      title: "Deactivate Outlet",
      description: `Are you sure you want to deactivate ${
        outlet?.name ?? "this outlet"
      }?\n\nThe outlet will be removed from active operations, but historical records will remain available.`,
      variant: "danger",
      confirmText: "Deactivate",
      cancelText: "Cancel",
      loadingText: "Deactivating...",
    });

    if (!confirmed) return;

    try {
      setError("");
      await deleteMutation.mutateAsync(id);
      setOperators((current) => current.filter((operator) => operator.outletId !== id));

      if (selectedOutlet?.id === id) {
        setSelectedOutlet(null);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to deactivate outlet"
      );
    }
  }

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

  function saveOperator() {
    if (!operatorForm.outletId || !operatorForm.name.trim()) return;

    if (editingOperatorId) {
      setOperators((current) =>
        current.map((operator) =>
          operator.id === editingOperatorId ? { ...operator, ...operatorForm } : operator
        )
      );
    } else {
      const nextOperator: OutletOperator = {
        id: `OPR-${String(operators.length + 1).padStart(3, "0")}`,
        ...operatorForm,
      };
      setOperators((current) => [nextOperator, ...current]);
    }

    setOperatorForm(emptyOperatorForm);
    setEditingOperatorId(null);
    setOperatorModalOpen(false);
  }

  async function deleteOperator(id: string) {
    const operator = operators.find((item) => item.id === id);

    const confirmed = await confirm({
      title: "Delete Operator",
      description: `Are you sure you want to delete ${
        operator?.name ?? "this operator"
      }?\n\nThis operator will no longer be available for task execution audit selection.`,
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      loadingText: "Deleting...",
    });

    if (!confirmed) return;

    setOperators((current) => current.filter((operator) => operator.id !== id));
  }

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



