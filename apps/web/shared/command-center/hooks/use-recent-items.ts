"use client";

import { commandItems } from "../constants";

export function useRecentItems() {
  return commandItems.slice(0, 4);
}
