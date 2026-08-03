"use client";

import { useSyncExternalStore } from "react";

import { initialOutletTaskStoreItems } from "./data";
import {
  OutletTaskExecutionStatus,
  OutletTaskStoreItem,
  OutletTaskStoreSummary,
} from "./types";

let outletTaskItems: OutletTaskStoreItem[] = initialOutletTaskStoreItems;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return outletTaskItems;
}

function getServerSnapshot() {
  return initialOutletTaskStoreItems;
}

export function useOutletTaskStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getOutletTaskStoreItems() {
  return outletTaskItems;
}

export function setOutletTaskStoreItems(items: OutletTaskStoreItem[]) {
  outletTaskItems = items;
  emitChange();
}

export function updateOutletTaskStoreItem(id: string, patch: Partial<OutletTaskStoreItem>) {
  outletTaskItems = outletTaskItems.map((item) =>
    item.id === id
      ? {
          ...item,
          ...patch,
          updatedAt: "Realtime",
        }
      : item
  );

  emitChange();
}

export function upsertOutletTaskStoreItem(item: OutletTaskStoreItem) {
  const exists = outletTaskItems.some((currentItem) => currentItem.id === item.id);

  outletTaskItems = exists
    ? outletTaskItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              ...item,
              updatedAt: "Realtime",
            }
          : currentItem
      )
    : [
        {
          ...item,
          updatedAt: "Realtime",
        },
        ...outletTaskItems,
      ];

  emitChange();
}

export function clearOutletTaskStore() {
  outletTaskItems = [];
  emitChange();
}

export function resetOutletTaskStore() {
  outletTaskItems = initialOutletTaskStoreItems;
  emitChange();
}

export function getOutletTaskStatusLabel(status: OutletTaskExecutionStatus) {
  const labels: Record<OutletTaskExecutionStatus, string> = {
    pending: "Pending",
    draft: "Draft",
    submitted: "Submitted",
    completed: "Completed",
    overdue: "Overdue",
  };

  return labels[status];
}

export function getOutletTaskStoreSummary(
  items: OutletTaskStoreItem[] = outletTaskItems
): OutletTaskStoreSummary {
  const total = items.length;
  const pending = items.filter((item) => item.status === "pending").length;
  const draft = items.filter((item) => item.status === "draft").length;
  const submitted = items.filter((item) => item.status === "submitted").length;
  const completed = items.filter((item) => item.status === "completed").length;
  const overdue = items.filter((item) => item.status === "overdue").length;

  const averageProgress =
    total > 0 ? Math.round(items.reduce((sum, item) => sum + item.progress, 0) / total) : 0;

  const averageScore =
    total > 0 ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / total) : 0;

  return {
    total,
    pending,
    draft,
    submitted,
    completed,
    overdue,
    averageProgress,
    averageScore,
  };
}

export function getOutletTaskCompletedCount(items: OutletTaskStoreItem[]) {
  return items.filter((item) => ["submitted", "completed"].includes(item.status)).length;
}

export function getOutletTaskStatusDistribution(items: OutletTaskStoreItem[]) {
  const summary = getOutletTaskStoreSummary(items);

  return [
    { name: "Completed/Submitted", value: summary.completed + summary.submitted },
    { name: "Draft", value: summary.draft },
    { name: "Pending", value: summary.pending },
    { name: "Overdue", value: summary.overdue },
  ];
}

export function getOutletTaskPerformance(items: OutletTaskStoreItem[]) {
  const outlets = Array.from(new Set(items.map((item) => item.outlet)));

  return outlets.map((outlet) => {
    const outletItems = items.filter((item) => item.outlet === outlet);

    const progress =
      outletItems.length > 0
        ? Math.round(outletItems.reduce((sum, item) => sum + item.progress, 0) / outletItems.length)
        : 0;

    return {
      outlet: outlet.replace("KOV ", ""),
      progress,
    };
  });
}

export function getOutletTaskFormBreakdown(items: OutletTaskStoreItem[]) {
  const forms = Array.from(new Set(items.map((item) => item.form)));

  return forms.map((form) => ({
    name: form,
    value: items.filter((item) => item.form === form).length,
  }));
}

export function getOutletTaskCompletionTrend(items: OutletTaskStoreItem[]) {
  const summary = getOutletTaskStoreSummary(items);

  return [
    { day: "Mon", completion: 82, submitted: 14 },
    { day: "Tue", completion: 88, submitted: 18 },
    { day: "Wed", completion: 91, submitted: 21 },
    { day: "Thu", completion: 86, submitted: 17 },
    {
      day: "Today",
      completion: summary.averageProgress,
      submitted: summary.submitted + summary.completed,
    },
  ];
}
