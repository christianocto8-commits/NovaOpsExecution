"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query/keys";
import { formTemplateService } from "@/services/form-template.service";

export function useFormTemplates() {
  return useQuery({
    queryKey: queryKeys.sop.formTemplates(),
    queryFn: formTemplateService.list,
  });
}

export function useActiveFormTemplates() {
  const query = useFormTemplates();
  const activeTemplates = useMemo(
    () => (query.data ?? []).filter((template) => template.status === "Active"),
    [query.data]
  );

  return {
    ...query,
    activeTemplates,
  };
}
