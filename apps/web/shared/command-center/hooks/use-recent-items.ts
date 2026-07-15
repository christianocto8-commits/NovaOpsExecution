"use client";

import { useSyncExternalStore } from "react";

import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";
import { commandItems } from "../constants";

export function useRecentItems() {
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );

  return commandItems
    .filter((item) => !item.allowedRoles || item.allowedRoles.includes(workspace.role))
    .slice(0, 4);
}
