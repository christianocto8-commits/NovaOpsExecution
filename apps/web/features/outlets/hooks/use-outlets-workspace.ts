"use client";

import { useMemo, useState } from "react";

import {
  emptyOperatorForm,
  emptyOutletForm,
  mockOutletOperators,
  mockOutlets,
} from "../data/outlets-data";
import {
  OperatorFormState,
  Outlet,
  OutletFormState,
  OutletOperator,
  OutletStatus,
} from "../types";

export function useOutletsWorkspace() {
  const [outlets, setOutlets] = useState<Outlet[]>(mockOutlets);
  const [operators, setOperators] =
    useState<OutletOperator[]>(mockOutletOperators);

  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const [outletModalOpen, setOutletModalOpen] = useState(false);
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [outletForm, setOutletForm] =
    useState<OutletFormState>(emptyOutletForm);

  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(
    null
  );
  const [operatorForm, setOperatorForm] =
    useState<OperatorFormState>(emptyOperatorForm);

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

    return operators.filter(
      (operator) => operator.outletId === selectedOutlet.id
    );
  }, [operators, selectedOutlet]);

  function openCreateOutletDialog() {
    setEditingOutletId(null);
    setOutletForm(emptyOutletForm);
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
    setOutletModalOpen(true);
  }

  function saveOutlet() {
    if (!outletForm.name.trim()) return;

    if (editingOutletId) {
      setOutlets((current) =>
        current.map((outlet) =>
          outlet.id === editingOutletId
            ? {
                ...outlet,
                ...outletForm,
              }
            : outlet
        )
      );
    } else {
      const nextOutlet: Outlet = {
        id: `OUT-${String(outlets.length + 1).padStart(3, "0")}`,
        ...outletForm,
        compliance: "0%",
        openTasks: 0,
        lastAudit: "Not audited",
      };

      setOutlets((current) => [nextOutlet, ...current]);
    }

    setOutletForm(emptyOutletForm);
    setEditingOutletId(null);
    setOutletModalOpen(false);
  }

  function updateOutletStatus(id: string, status: OutletStatus) {
    setOutlets((current) =>
      current.map((outlet) => (outlet.id === id ? { ...outlet, status } : outlet))
    );
  }

  function deleteOutlet(id: string) {
    setOutlets((current) => current.filter((outlet) => outlet.id !== id));
    setOperators((current) =>
      current.filter((operator) => operator.outletId !== id)
    );

    if (selectedOutlet?.id === id) setSelectedOutlet(null);
  }

  function openCreateOperatorDialog(outletId: string) {
    setEditingOperatorId(null);
    setOperatorForm({
      ...emptyOperatorForm,
      outletId,
    });
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
          operator.id === editingOperatorId
            ? {
                ...operator,
                ...operatorForm,
              }
            : operator
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

  function deleteOperator(id: string) {
    setOperators((current) => current.filter((operator) => operator.id !== id));
  }

  return {
    outlets,
    operators,
    selectedOutlet,
    setSelectedOutlet,
    selectedOutletOperators,
    metrics,

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
