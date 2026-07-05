"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { EnterpriseFilterState, EnterpriseSavedView } from "../types";
import { createSavedView, parseSavedViews, serializeSavedViews } from "../utils/saved-view-utils";

const SAVED_VIEW_EVENT = "novaops-saved-filter-views-change";

const savedViewsCache = new Map<string, EnterpriseSavedView[]>();
const savedViewsRawCache = new Map<string, string | null>();

function getStorageKey(scope: string) {
  return `novaops_saved_filter_views_${scope}`;
}

function emitSavedViewChange() {
  window.dispatchEvent(new Event(SAVED_VIEW_EVENT));
}

function subscribeSavedViews(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SAVED_VIEW_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAVED_VIEW_EVENT, callback);
  };
}

function getSavedViewsSnapshot(scope: string) {
  const storageKey = getStorageKey(scope);
  const raw = localStorage.getItem(storageKey);
  const cachedRaw = savedViewsRawCache.get(scope);

  if (cachedRaw === raw && savedViewsCache.has(scope)) {
    return savedViewsCache.get(scope) ?? [];
  }

  const parsed = parseSavedViews(raw);

  savedViewsRawCache.set(scope, raw);
  savedViewsCache.set(scope, parsed);

  return parsed;
}

function getServerSavedViewsSnapshot() {
  return [];
}

export function useSavedFilterViews(scope = "default") {
  const views = useSyncExternalStore(
    subscribeSavedViews,
    () => getSavedViewsSnapshot(scope),
    getServerSavedViewsSnapshot
  );

  const defaultView = useMemo(() => views.find((view) => view.isDefault) ?? null, [views]);

  const saveViews = useCallback(
    (nextViews: EnterpriseSavedView[]) => {
      const storageKey = getStorageKey(scope);
      const raw = serializeSavedViews(nextViews);

      localStorage.setItem(storageKey, raw);
      savedViewsRawCache.set(scope, raw);
      savedViewsCache.set(scope, nextViews);
      emitSavedViewChange();
    },
    [scope]
  );

  const createView = useCallback(
    (name: string, filters: EnterpriseFilterState) => {
      const nextView = createSavedView({ name, filters });
      saveViews([...views, nextView]);
      return nextView;
    },
    [saveViews, views]
  );

  const deleteView = useCallback(
    (viewId: string) => {
      saveViews(views.filter((view) => view.id !== viewId));
    },
    [saveViews, views]
  );

  const setDefaultView = useCallback(
    (viewId: string) => {
      saveViews(
        views.map((view) => ({
          ...view,
          isDefault: view.id === viewId,
          updatedAt: view.id === viewId ? new Date().toISOString() : view.updatedAt,
        }))
      );
    },
    [saveViews, views]
  );

  return {
    views,
    defaultView,
    createView,
    deleteView,
    setDefaultView,
  };
}
