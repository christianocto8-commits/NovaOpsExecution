export const queryKeys = {
  identity: {
    users: ["identity", "users"] as const,
    roles: ["identity", "roles"] as const,
    outlets: ["identity", "outlets"] as const,
    operators: ["identity", "operators"] as const,
    outletMetrics: ["identity", "outlet-metrics"] as const,
  },

  sop: {
    tasks: () => ["sop", "tasks"] as const,
    formTemplates: () => ["sop", "form-templates"] as const,
  },

  workflow: {
    all: ["workflow"] as const,
    lists: () => ["workflow", "list"] as const,
    detail: (workflowId: string) => ["workflow", "detail", workflowId] as const,

    instances: () => ["workflow", "instances"] as const,
    instance: (instanceId: string) => ["workflow", "instance", instanceId] as const,
    instanceSteps: (instanceId: string) =>
      ["workflow", "instance", instanceId, "steps"] as const,
    instanceHistory: (instanceId: string) =>
      ["workflow", "instance", instanceId, "history"] as const,

    approvalMatrix: (workflowId: string) =>
      ["workflow", "approval-matrix", workflowId] as const,

    escalationRules: (workflowId: string) =>
      ["workflow", "escalation-rules", workflowId] as const,

    notificationTemplates: () =>
      ["workflow", "notification-templates"] as const,
    notificationInbox: () => ["workflow", "notification-inbox"] as const,
  },
};
