"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { approvalService } from "@/services/approval.service";
import { escalationService } from "@/services/escalation.service";
import { notificationService } from "@/services/notification.service";
import { workflowService } from "@/services/workflow.service";
import { queryKeys } from "@/lib/query/keys";
import type {
  NotificationTemplateCreate,
  NotificationTemplateUpdate,
  UUID,
  WorkflowActionRequest,
  WorkflowApprovalMatrixCreate,
  WorkflowApprovalMatrixUpdate,
  WorkflowDefinitionCreate,
  WorkflowDefinitionUpdate,
  WorkflowEscalationRuleCreate,
  WorkflowEscalationRuleUpdate,
  WorkflowInstanceCreate,
} from "@/features/workflows/types";

export function useWorkflows() {
  return useQuery({
    queryKey: queryKeys.workflow.lists(),
    queryFn: workflowService.list,
  });
}

export function useWorkflow(workflowId?: UUID) {
  return useQuery({
    queryKey: workflowId
      ? queryKeys.workflow.detail(workflowId)
      : ["workflow", "detail", "empty"],
    queryFn: () => workflowService.get(workflowId as UUID),
    enabled: Boolean(workflowId),
  });
}

export function useWorkflowInstances() {
  return useQuery({
    queryKey: queryKeys.workflow.instances(),
    queryFn: workflowService.listInstances,
  });
}

export function usePendingWorkflowInstances() {
  return useQuery({
    queryKey: [...queryKeys.workflow.instances(), "pending-for-me"],
    queryFn: workflowService.listPendingForMe,
  });
}

export function useWorkflowInstance(instanceId?: UUID) {
  return useQuery({
    queryKey: instanceId
      ? queryKeys.workflow.instance(instanceId)
      : ["workflow", "instance", "empty"],
    queryFn: () => workflowService.getInstance(instanceId as UUID),
    enabled: Boolean(instanceId),
  });
}

export function useWorkflowInstanceSteps(instanceId?: UUID) {
  return useQuery({
    queryKey: instanceId
      ? queryKeys.workflow.instanceSteps(instanceId)
      : ["workflow", "instance", "empty", "steps"],
    queryFn: () => workflowService.listInstanceSteps(instanceId as UUID),
    enabled: Boolean(instanceId),
  });
}

export function useWorkflowInstanceHistory(instanceId?: UUID) {
  return useQuery({
    queryKey: instanceId
      ? queryKeys.workflow.instanceHistory(instanceId)
      : ["workflow", "instance", "empty", "history"],
    queryFn: () => workflowService.listHistory(instanceId as UUID),
    enabled: Boolean(instanceId),
  });
}

export function useApprovalMatrix(workflowId?: UUID) {
  return useQuery({
    queryKey: workflowId
      ? queryKeys.workflow.approvalMatrix(workflowId)
      : ["workflow", "approval-matrix", "empty"],
    queryFn: () => approvalService.listByWorkflow(workflowId as UUID),
    enabled: Boolean(workflowId),
  });
}

export function useEscalationRules(workflowId?: UUID) {
  return useQuery({
    queryKey: workflowId
      ? queryKeys.workflow.escalationRules(workflowId)
      : ["workflow", "escalation-rules", "empty"],
    queryFn: () => escalationService.listByWorkflow(workflowId as UUID),
    enabled: Boolean(workflowId),
  });
}

export function useNotificationTemplates() {
  return useQuery({
    queryKey: queryKeys.workflow.notificationTemplates(),
    queryFn: notificationService.listTemplates,
  });
}

export function useNotificationInbox() {
  return useQuery({
    queryKey: queryKeys.workflow.notificationInbox(),
    queryFn: notificationService.listMine,
  });
}

export function useWorkflowMutations() {
  const queryClient = useQueryClient();

  const invalidateWorkflowList = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.workflow.lists() });

  const invalidateInstances = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.workflow.instances() });

  return {
    createWorkflow: useMutation({
      mutationFn: (payload: WorkflowDefinitionCreate) =>
        workflowService.create(payload),
      onSuccess: invalidateWorkflowList,
    }),

    updateWorkflow: useMutation({
      mutationFn: ({
        workflowId,
        payload,
      }: {
        workflowId: UUID;
        payload: WorkflowDefinitionUpdate;
      }) => workflowService.update(workflowId, payload),
      onSuccess: (_, variables) => {
        invalidateWorkflowList();
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.detail(variables.workflowId),
        });
      },
    }),

    deleteWorkflow: useMutation({
      mutationFn: (workflowId: UUID) => workflowService.remove(workflowId),
      onSuccess: invalidateWorkflowList,
    }),

    createInstance: useMutation({
      mutationFn: (payload: WorkflowInstanceCreate) =>
        workflowService.createInstance(payload),
      onSuccess: invalidateInstances,
    }),

    approveInstance: useMutation({
      mutationFn: ({
        instanceId,
        payload,
      }: {
        instanceId: UUID;
        payload: WorkflowActionRequest;
      }) => workflowService.approve(instanceId, payload),
      onSuccess: (_, variables) => {
        invalidateInstances();
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.instance(variables.instanceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.instanceHistory(variables.instanceId),
        });
      },
    }),

    rejectInstance: useMutation({
      mutationFn: ({
        instanceId,
        payload,
      }: {
        instanceId: UUID;
        payload: WorkflowActionRequest;
      }) => workflowService.reject(instanceId, payload),
      onSuccess: invalidateInstances,
    }),

    returnInstance: useMutation({
      mutationFn: ({
        instanceId,
        payload,
      }: {
        instanceId: UUID;
        payload: WorkflowActionRequest;
      }) => workflowService.returnInstance(instanceId, payload),
      onSuccess: invalidateInstances,
    }),

    cancelInstance: useMutation({
      mutationFn: ({
        instanceId,
        payload,
      }: {
        instanceId: UUID;
        payload: WorkflowActionRequest;
      }) => workflowService.cancel(instanceId, payload),
      onSuccess: invalidateInstances,
    }),
  };
}

export function useApprovalMatrixMutations(workflowId?: UUID) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (workflowId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflow.approvalMatrix(workflowId),
      });
    }
  };

  return {
    createApprovalMatrix: useMutation({
      mutationFn: (payload: WorkflowApprovalMatrixCreate) =>
        approvalService.create(payload),
      onSuccess: invalidate,
    }),

    updateApprovalMatrix: useMutation({
      mutationFn: ({
        matrixId,
        payload,
      }: {
        matrixId: UUID;
        payload: WorkflowApprovalMatrixUpdate;
      }) => approvalService.update(matrixId, payload),
      onSuccess: invalidate,
    }),

    deleteApprovalMatrix: useMutation({
      mutationFn: (matrixId: UUID) => approvalService.remove(matrixId),
      onSuccess: invalidate,
    }),
  };
}

export function useEscalationMutations(workflowId?: UUID) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (workflowId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workflow.escalationRules(workflowId),
      });
    }
  };

  return {
    createEscalationRule: useMutation({
      mutationFn: (payload: WorkflowEscalationRuleCreate) =>
        escalationService.create(payload),
      onSuccess: invalidate,
    }),

    updateEscalationRule: useMutation({
      mutationFn: ({
        ruleId,
        payload,
      }: {
        ruleId: UUID;
        payload: WorkflowEscalationRuleUpdate;
      }) => escalationService.update(ruleId, payload),
      onSuccess: invalidate,
    }),

    deleteEscalationRule: useMutation({
      mutationFn: (ruleId: UUID) => escalationService.remove(ruleId),
      onSuccess: invalidate,
    }),

    processEscalations: useMutation({
      mutationFn: escalationService.process,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.instances(),
        });
      },
    }),

    assignDueDates: useMutation({
      mutationFn: escalationService.assignDueDates,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.instances(),
        });
      },
    }),
  };
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  return {
    createTemplate: useMutation({
      mutationFn: (payload: NotificationTemplateCreate) =>
        notificationService.createTemplate(payload),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.notificationTemplates(),
        });
      },
    }),

    updateTemplate: useMutation({
      mutationFn: ({
        templateId,
        payload,
      }: {
        templateId: UUID;
        payload: NotificationTemplateUpdate;
      }) => notificationService.updateTemplate(templateId, payload),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.notificationTemplates(),
        });
      },
    }),

    deleteTemplate: useMutation({
      mutationFn: (templateId: UUID) =>
        notificationService.removeTemplate(templateId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.notificationTemplates(),
        });
      },
    }),

    processPendingNotifications: useMutation({
      mutationFn: notificationService.processPending,
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.workflow.notificationInbox(),
        });
      },
    }),
  };
}
