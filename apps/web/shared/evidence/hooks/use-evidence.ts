"use client";

import { useState } from "react";

import { EvidenceItem } from "../types";

export function useEvidence(initialItems: EvidenceItem[] = []) {
  const [items, setItems] = useState<EvidenceItem[]>(initialItems);

  return {
    items,
    setItems,
    count: items.length,
    hasEvidence: items.length > 0,
  };
}
