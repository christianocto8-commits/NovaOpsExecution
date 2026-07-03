import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDraft,
  DraftsResponse,
  getDrafts,
  publishDraft,
} from "../services/drafts-api";

export function useDrafts() {
  return useQuery({
    queryKey: ["drafts"],
    queryFn: getDrafts,
  });
}

export function usePublishDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishDraft,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["drafts"] });

      const previousDrafts = queryClient.getQueryData<DraftsResponse>(["drafts"]);

      queryClient.setQueryData<DraftsResponse>(["drafts"], (current) => {
        if (!current) return current;

        return {
          items: current.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "published",
                  updatedAt: "Just now",
                }
              : item,
          ),
        };
      });

      return { previousDrafts };
    },

    onError: (_error, _id, context) => {
      if (context?.previousDrafts) {
        queryClient.setQueryData(["drafts"], context.previousDrafts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDraft,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["drafts"] });

      const previousDrafts = queryClient.getQueryData<DraftsResponse>(["drafts"]);

      queryClient.setQueryData<DraftsResponse>(["drafts"], (current) => {
        if (!current) return current;

        return {
          items: current.items.filter((item) => item.id !== id),
        };
      });

      return { previousDrafts };
    },

    onError: (_error, _id, context) => {
      if (context?.previousDrafts) {
        queryClient.setQueryData(["drafts"], context.previousDrafts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}