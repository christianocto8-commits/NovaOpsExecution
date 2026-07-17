"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getSettings,
  updateSettings,
  type SettingsPayload,
  type SettingsResponse,
} from "@/features/settings/settings-api";

const SETTINGS_QUERY_KEY = ["settings"];

export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery<SettingsResponse>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getSettings,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (payload: SettingsPayload) => updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEY,
      });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isPending,
    error:
      query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,

    reload: query.refetch,

    saveSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError:
      mutation.error instanceof Error
        ? mutation.error.message
        : mutation.error
          ? String(mutation.error)
          : null,
  };
}
