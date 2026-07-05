import {
  WORKFLOW_MODULE_LABEL,
  WORKFLOW_STATUS_META,
  WORKFLOW_TRANSITIONS,
} from "../constants/workflow";
import {
  WorkflowActor,
  WorkflowAssignmentRule,
  WorkflowInboxBucket,
  WorkflowInboxFilter,
  WorkflowInboxItem,
  WorkflowInboxSort,
  WorkflowItem,
  WorkflowModule,
  WorkflowNotification,
  WorkflowNotificationPriority,
  WorkflowNotificationRecipient,
  WorkflowNotificationRule,
  WorkflowNotificationType,
  WorkflowPriority,
  WorkflowRole,
  WorkflowSlaEvaluation,
  WorkflowSlaPolicy,
  WorkflowSlaUnit,
  WorkflowStatus,
  WorkflowTimelineEvent,
  WorkflowTimelineEventType,
  WorkflowTransitionAction,
} from "../types/workflow";

export function getWorkflowModuleLabel(module: WorkflowModule) {
  return WORKFLOW_MODULE_LABEL[module];
}

export function getWorkflowStatusMeta(status: WorkflowStatus) {
  return WORKFLOW_STATUS_META[status];
}

export function getWorkflowStatusLabel(status: WorkflowStatus) {
  return WORKFLOW_STATUS_META[status].label;
}

export function isWorkflowTerminalStatus(status: WorkflowStatus) {
  return Boolean(WORKFLOW_STATUS_META[status].isTerminal);
}

export function isWorkflowActionableStatus(status: WorkflowStatus) {
  return Boolean(WORKFLOW_STATUS_META[status].isActionable);
}

export function getWorkflowTransitionsFrom(status: WorkflowStatus) {
  return WORKFLOW_TRANSITIONS.filter((transition) => transition.from === status);
}

export function getWorkflowTransitionByAction(
  status: WorkflowStatus,
  action: WorkflowTransitionAction
) {
  return WORKFLOW_TRANSITIONS.find(
    (transition) => transition.from === status && transition.action === action
  );
}

export function canWorkflowTransition(from: WorkflowStatus, to: WorkflowStatus) {
  return WORKFLOW_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to
  );
}

export function workflowRuleMatchesItem(rule: WorkflowAssignmentRule, item: WorkflowItem) {
  if (rule.module !== item.module) return false;

  if (rule.outletId && rule.outletId !== item.outletId) return false;

  if (rule.priority && rule.priority !== item.priority) return false;

  return true;
}

export function workflowRuleMatchesRole(rule: WorkflowAssignmentRule, role?: WorkflowRole) {
  if (!rule.role) return true;

  return rule.role === role;
}

export function getWorkflowPriorityWeight(priority?: WorkflowPriority) {
  const weight: Record<WorkflowPriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  return priority ? weight[priority] : 0;
}

export function getWorkflowSlaDurationMinutes(duration: number, unit: WorkflowSlaUnit) {
  if (unit === "minute") return duration;

  if (unit === "hour") return duration * 60;

  return duration * 24 * 60;
}

export function calculateWorkflowDueAt(startAt: string, duration: number, unit: WorkflowSlaUnit) {
  const startDate = new Date(startAt);
  const minutes = getWorkflowSlaDurationMinutes(duration, unit);

  return new Date(startDate.getTime() + minutes * 60 * 1000).toISOString();
}

export function workflowSlaPolicyMatchesItem(policy: WorkflowSlaPolicy, item: WorkflowItem) {
  if (policy.module !== item.module) return false;

  if (policy.outletId && policy.outletId !== item.outletId) return false;

  if (policy.priority && policy.priority !== item.priority) return false;

  return true;
}

export function createWorkflowTimelineEvent({
  item,
  type,
  title,
  description,
  actor,
  fromStatus,
  toStatus,
  metadata,
}: {
  item: WorkflowItem;
  type: WorkflowTimelineEventType;
  title: string;
  description?: string;
  actor?: WorkflowActor;
  fromStatus?: WorkflowStatus;
  toStatus?: WorkflowStatus;
  metadata?: WorkflowTimelineEvent["metadata"];
}): WorkflowTimelineEvent {
  return {
    id: `workflow-event-${item.id}-${Date.now()}`,
    itemId: item.id,
    module: item.module,
    type,
    title,
    description,
    actor,
    fromStatus,
    toStatus,
    createdAt: new Date().toISOString(),
    metadata,
  };
}

export function getWorkflowTimelineEventLabel(type: WorkflowTimelineEventType) {
  const labels: Record<WorkflowTimelineEventType, string> = {
    created: "Created",
    assigned: "Assigned",
    started: "Started",
    submitted: "Submitted",
    reviewed: "Reviewed",
    approved: "Approved",
    rejected: "Rejected",
    revision_requested: "Revision Requested",
    completed: "Completed",
    cancelled: "Cancelled",
    overdue: "Overdue",
    blocked: "Blocked",
    unblocked: "Unblocked",
    reopened: "Reopened",
    commented: "Commented",
    evidence_added: "Evidence Added",
    sla_applied: "SLA Applied",
    updated: "Updated",
  };

  return labels[type];
}

export function workflowNotificationRuleMatches(
  rule: WorkflowNotificationRule,
  item: WorkflowItem,
  event?: WorkflowTimelineEvent
) {
  if (rule.module !== item.module) return false;

  if (rule.priority && rule.priority !== item.priority) return false;

  if (rule.status && rule.status !== item.status) return false;

  if (rule.eventType && rule.eventType !== event?.type) return false;

  return true;
}

export function createWorkflowNotification({
  item,
  type,
  priority,
  title,
  message,
  recipients,
  metadata,
}: {
  item: WorkflowItem;
  type: WorkflowNotificationType;
  priority?: WorkflowNotificationPriority;
  title: string;
  message: string;
  recipients: WorkflowNotificationRecipient[];
  metadata?: WorkflowNotification["metadata"];
}): WorkflowNotification {
  return {
    id: `workflow-notification-${item.id}-${Date.now()}`,
    itemId: item.id,
    module: item.module,
    type,
    priority: priority ?? "normal",
    title,
    message,
    recipients,
    createdAt: new Date().toISOString(),
    metadata,
  };
}

export function getWorkflowNotificationPriorityFromSla(
  evaluation: WorkflowSlaEvaluation
): WorkflowNotificationPriority {
  if (evaluation.status === "overdue") return "critical";

  if (evaluation.status === "due_soon") return "high";

  return "normal";
}

export function getWorkflowNotificationTypeFromEvent(
  event: WorkflowTimelineEvent
): WorkflowNotificationType {
  if (event.type === "assigned") return "assignment";

  if (event.type === "revision_requested") return "revision_required";

  if (event.type === "submitted") return "approval_required";

  if (event.type === "commented") return "comment";

  if (event.type === "evidence_added") return "evidence";

  return "status_change";
}

export function resolveWorkflowInboxBucket(
  item: WorkflowItem,
  currentUserId?: string
): WorkflowInboxBucket {
  if (item.status === "overdue") return "overdue";

  if (item.status === "blocked") return "blocked";

  if (item.status === "completed") return "completed";

  if (["submitted", "reviewed"].includes(item.status)) return "review";

  if (currentUserId && item.assignedTo === currentUserId) return "my_tasks";

  if (item.assignee?.type === "team" || item.assignee?.type === "role") {
    return "team_tasks";
  }

  return "all";
}

export function createWorkflowInboxItem(
  item: WorkflowItem,
  currentUserId?: string
): WorkflowInboxItem {
  return {
    id: `workflow-inbox-${item.module}-${item.id}`,
    item,
    bucket: resolveWorkflowInboxBucket(item, currentUserId),
    title: item.title,
    subtitle: getWorkflowModuleLabel(item.module),
    priority: item.priority ?? "medium",
    status: item.status,
    dueAt: item.dueAt,
    assignedTo: item.assignedTo,
    outletId: item.outletId,
    updatedAt: item.updatedAt,
  };
}

export function workflowInboxItemMatchesFilter(
  inboxItem: WorkflowInboxItem,
  filter?: WorkflowInboxFilter
) {
  if (!filter) return true;

  if (filter.module && inboxItem.item.module !== filter.module) return false;

  if (filter.bucket && inboxItem.bucket !== filter.bucket) return false;

  if (filter.status && inboxItem.status !== filter.status) return false;

  if (filter.priority && inboxItem.priority !== filter.priority) return false;

  if (filter.outletId && inboxItem.outletId !== filter.outletId) return false;

  if (filter.assigneeId && inboxItem.assignedTo !== filter.assigneeId) {
    return false;
  }

  if (filter.search) {
    const keyword = filter.search.toLowerCase().trim();

    if (!inboxItem.title.toLowerCase().includes(keyword)) return false;
  }

  return true;
}

export function sortWorkflowInboxItems(
  items: WorkflowInboxItem[],
  sortBy: WorkflowInboxSort = "priority"
) {
  return [...items].sort((a, b) => {
    if (sortBy === "priority") {
      return getWorkflowPriorityWeight(b.priority) - getWorkflowPriorityWeight(a.priority);
    }

    const dateA = new Date(
      String((a as unknown as Record<string, unknown>)[sortBy] ?? 0)
    ).getTime();
    const dateB = new Date(
      String((b as unknown as Record<string, unknown>)[sortBy] ?? 0)
    ).getTime();

    return dateA - dateB;
  });
}
