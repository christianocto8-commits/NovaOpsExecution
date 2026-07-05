"use client";

import { useMemo } from "react";

import { calculateFormProgress } from "../utils";
import { ProgressField } from "../types";

export function useFormProgress(fields: ProgressField[], values: Record<string, unknown>) {
  return useMemo(() => {
    return calculateFormProgress(fields, values);
  }, [fields, values]);
}
