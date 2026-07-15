"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/services/notification.service";

const notificationKeys = {
  all: ["notifications"] as const,
  inbox: () => [...notificationKeys.all, "inbox"] as const,
};

export function useNotificationsWorkspace() {
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: notificationKeys.inbox(),
    queryFn: notificationService.listMine,
    retry: false,
  });

  const processMutation = useMutation({
    mutationFn: notificationService.processPending,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.inbox(),
      });
    },
  });

  return {
    notifications: inboxQuery.data ?? [],
    isLoading: inboxQuery.isLoading,
    isError: inboxQuery.isError,
    error: inboxQuery.error,
    refetch: inboxQuery.refetch,
    processPending: processMutation.mutateAsync,
    isProcessing: processMutation.isPending,
  };
}
