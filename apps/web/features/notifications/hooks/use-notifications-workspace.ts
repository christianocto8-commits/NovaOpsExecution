"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/services/notification.service";

const notificationKeys = {
  all: ["notifications"] as const,
  inbox: () => [...notificationKeys.all, "inbox"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export { notificationKeys };

export function useNotificationsWorkspace() {
  const queryClient = useQueryClient();

  const inboxQuery = useQuery({
    queryKey: notificationKeys.inbox(),
    queryFn: notificationService.listMine,
    retry: false,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationService.getUnreadCount,
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

  const markReadMutation = useMutation({
    mutationFn: (deliveryIds?: string[]) => notificationService.markRead(deliveryIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.inbox() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });

  return {
    notifications: inboxQuery.data ?? [],
    unreadCount: unreadCountQuery.data?.unread_count ?? 0,
    isLoading: inboxQuery.isLoading,
    isError: inboxQuery.isError,
    error: inboxQuery.error,
    refetch: inboxQuery.refetch,
    processPending: processMutation.mutateAsync,
    isProcessing: processMutation.isPending,
    markRead: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
  };
}

export function useNotificationUnreadCount(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationService.getUnreadCount,
    retry: false,
    refetchInterval: options?.refetchInterval,
  });
}
