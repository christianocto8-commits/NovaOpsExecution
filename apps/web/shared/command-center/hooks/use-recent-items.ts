"use client";

import { useCallback, useEffect, useState } from "react";

import {
  COMMAND_RECENT_LIMIT,
  COMMAND_RECENT_STORAGE_KEY,
} from "../constants";
import { RecentCommandItem } from "../types";

function readRecentItems() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMMAND_RECENT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed as RecentCommandItem[];
  } catch {
    return [];
  }
}

function writeRecentItems(items: RecentCommandItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    COMMAND_RECENT_STORAGE_KEY,
    JSON.stringify(items)
  );
}

export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<RecentCommandItem[]>([]);

  useEffect(() => {
    setRecentItems(readRecentItems());
  }, []);

  const registerRecentItem = useCallback(
    (item: Omit<RecentCommandItem, "createdAt">) => {
      setRecentItems((current) => {
        const nextItem: RecentCommandItem = {
          ...item,
          createdAt: new Date().toISOString(),
        };

        const deduped = current.filter(
          (recentItem) => recentItem.id !== item.id
        );

        const next = [nextItem, ...deduped].slice(0, COMMAND_RECENT_LIMIT);

        writeRecentItems(next);

        return next;
      });
    },
    []
  );

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
    writeRecentItems([]);
  }, []);

  return {
    recentItems,
    registerRecentItem,
    clearRecentItems,
  };
}