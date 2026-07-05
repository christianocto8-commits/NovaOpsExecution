import {
  WorkflowActor,
  WorkflowAssignmentResult,
  WorkflowAssignmentRule,
  WorkflowInboxFilter,
  WorkflowInboxItem,
  WorkflowInboxSort,
  WorkflowItem,
  WorkflowNotification,
  WorkflowNotificationRecipient,
  WorkflowNotificationRule,
  WorkflowRole,
  WorkflowSlaEvaluation,
  WorkflowSlaPolicy,
  WorkflowStatus,
  WorkflowTimelineEvent,
  WorkflowTimelineEventType,
  WorkflowTransitionAction,
  WorkflowTransitionResult,
} from "../types/workflow";
import {
  calculateWorkflowDueAt,
  createWorkflowInboxItem,
  createWorkflowNotification,
  createWorkflowTimelineEvent,
  getWorkflowNotificationPriorityFromSla,
  getWorkflowNotificationTypeFromEvent,
  getWorkflowPriorityWeight,
  getWorkflowTransitionByAction,
  getWorkflowTransitionsFrom,
  isWorkflowActionableStatus,
  isWorkflowTerminalStatus,
  sortWorkflowInboxItems,
  workflowInboxItemMatchesFilter,
  workflowNotificationRuleMatches,
  workflowRuleMatchesItem,
  workflowRuleMatchesRole,
  workflowSlaPolicyMatchesItem,
} from "../utils/workflow";

export class WorkflowEngine {
  static canOpen(item?: WorkflowItem) {
    return Boolean(item?.id);
  }

  static isSameWorkflowItem(a?: WorkflowItem, b?: WorkflowItem) {
    return Boolean(a && b && a.id === b.id && a.module === b.module);
  }

  static isTerminal(status: WorkflowStatus) {
    return isWorkflowTerminalStatus(status);
  }

  static isActionable(status: WorkflowStatus) {
    return isWorkflowActionableStatus(status);
  }

  static canEdit(item?: WorkflowItem) {
    if (!item) return false;
    return !this.isTerminal(item.status);
  }

  static canSubmit(item?: WorkflowItem) {
    if (!item) return false;
    return ["draft", "assigned", "in_progress", "revision_required"].includes(item.status);
  }

  static getAvailableTransitions(item?: WorkflowItem) {
    if (!item || this.isTerminal(item.status)) return [];
    return getWorkflowTransitionsFrom(item.status);
  }

  static canTransition(
    item: WorkflowItem | undefined,
    action: WorkflowTransitionAction
  ): WorkflowTransitionResult {
    if (!item) {
      return {
        allowed: false,
        from: "draft",
        action,
        reason: "Workflow item is missing.",
      };
    }

    if (this.isTerminal(item.status)) {
      return {
        allowed: false,
        from: item.status,
        action,
        reason: "Terminal workflow status cannot transition.",
      };
    }

    const transition = getWorkflowTransitionByAction(item.status, action);

    if (!transition) {
      return {
        allowed: false,
        from: item.status,
        action,
        reason: "Transition is not allowed from current status.",
      };
    }

    if (transition.requiresAssignee && !item.assignedTo && !item.assignee) {
      return {
        allowed: false,
        from: item.status,
        to: transition.to,
        action,
        reason: "Transition requires assignee.",
      };
    }

    return {
      allowed: true,
      from: item.status,
      to: transition.to,
      action,
    };
  }

  static getNextStatus(item: WorkflowItem | undefined, action: WorkflowTransitionAction) {
    const result = this.canTransition(item, action);
    return result.allowed ? result.to : undefined;
  }

  static resolveAssignment(
    item: WorkflowItem | undefined,
    rules: WorkflowAssignmentRule[],
    currentRole?: WorkflowRole
  ): WorkflowAssignmentResult {
    if (!item) {
      return {
        assigned: false,
        reason: "Workflow item is missing.",
      };
    }

    const matchedRules = rules
      .filter((rule) => workflowRuleMatchesItem(rule, item))
      .filter((rule) => workflowRuleMatchesRole(rule, currentRole))
      .sort((a, b) => {
        const outletScoreA = a.outletId ? 10 : 0;
        const outletScoreB = b.outletId ? 10 : 0;
        const priorityScoreA = getWorkflowPriorityWeight(a.priority);
        const priorityScoreB = getWorkflowPriorityWeight(b.priority);

        return outletScoreB + priorityScoreB - (outletScoreA + priorityScoreA);
      });

    const selectedRule = matchedRules[0];

    if (!selectedRule) {
      return {
        assigned: false,
        reason: "No assignment rule matched.",
      };
    }

    return {
      assigned: true,
      assignee: selectedRule.assignee,
    };
  }

  static assignItem(
    item: WorkflowItem,
    rules: WorkflowAssignmentRule[],
    currentRole?: WorkflowRole
  ): WorkflowItem {
    const result = this.resolveAssignment(item, rules, currentRole);

    if (!result.assigned || !result.assignee) return item;

    return {
      ...item,
      assignee: result.assignee,
      assignedTo: result.assignee.id,
      status: item.status === "draft" ? "assigned" : item.status,
      updatedAt: new Date().toISOString(),
    };
  }

  static resolveSlaPolicy(item: WorkflowItem | undefined, policies: WorkflowSlaPolicy[]) {
    if (!item) return undefined;

    return policies
      .filter((policy) => workflowSlaPolicyMatchesItem(policy, item))
      .sort((a, b) => {
        const outletScoreA = a.outletId ? 10 : 0;
        const outletScoreB = b.outletId ? 10 : 0;
        const priorityScoreA = getWorkflowPriorityWeight(a.priority);
        const priorityScoreB = getWorkflowPriorityWeight(b.priority);

        return outletScoreB + priorityScoreB - (outletScoreA + priorityScoreA);
      })[0];
  }

  static applySla(item: WorkflowItem, policies: WorkflowSlaPolicy[]): WorkflowItem {
    if (item.dueAt) return item;

    const policy = this.resolveSlaPolicy(item, policies);

    if (!policy) return item;

    return {
      ...item,
      dueAt: calculateWorkflowDueAt(item.createdAt, policy.duration, policy.unit),
      slaPolicyId: policy.id,
      updatedAt: new Date().toISOString(),
    };
  }

  static evaluateSla(item: WorkflowItem | undefined, now = new Date()): WorkflowSlaEvaluation {
    if (!item) {
      return {
        status: "none",
        reason: "Workflow item is missing.",
      };
    }

    if (!item.dueAt) {
      return {
        status: "none",
        reason: "Workflow item has no due date.",
      };
    }

    if (this.isTerminal(item.status)) {
      return {
        status: "none",
        dueAt: item.dueAt,
        reason: "Terminal workflow item does not require SLA evaluation.",
      };
    }

    const dueDate = new Date(item.dueAt);
    const remainingMinutes = Math.ceil((dueDate.getTime() - now.getTime()) / 60000);

    if (remainingMinutes < 0) {
      return {
        status: "overdue",
        dueAt: item.dueAt,
        overdueMinutes: Math.abs(remainingMinutes),
      };
    }

    if (remainingMinutes <= 60) {
      return {
        status: "due_soon",
        dueAt: item.dueAt,
        remainingMinutes,
      };
    }

    return {
      status: "on_track",
      dueAt: item.dueAt,
      remainingMinutes,
    };
  }

  static markOverdueIfNeeded(item: WorkflowItem, now = new Date()): WorkflowItem {
    const evaluation = this.evaluateSla(item, now);

    if (evaluation.status !== "overdue") return item;
    if (item.status === "overdue") return item;

    return {
      ...item,
      status: "overdue",
      updatedAt: now.toISOString(),
    };
  }

  static createTimelineEvent(args: {
    item: WorkflowItem;
    type: WorkflowTimelineEventType;
    title: string;
    description?: string;
    actor?: WorkflowActor;
    fromStatus?: WorkflowStatus;
    toStatus?: WorkflowStatus;
    metadata?: WorkflowTimelineEvent["metadata"];
  }) {
    return createWorkflowTimelineEvent(args);
  }

  static transitionWithTimeline(args: {
    item: WorkflowItem;
    action: WorkflowTransitionAction;
    actor?: WorkflowActor;
    description?: string;
  }) {
    const { item, action, actor, description } = args;
    const result = this.canTransition(item, action);

    if (!result.allowed || !result.to) {
      return {
        item,
        event: undefined,
        result,
      };
    }

    const updatedItem: WorkflowItem = {
      ...item,
      status: result.to,
      updatedAt: new Date().toISOString(),
    };

    const event = createWorkflowTimelineEvent({
      item,
      type: this.getTimelineEventTypeFromAction(action),
      title: `Workflow ${action.replace(/_/g, " ")}`,
      description,
      actor,
      fromStatus: item.status,
      toStatus: result.to,
      metadata: {
        action,
      },
    });

    return {
      item: updatedItem,
      event,
      result,
    };
  }

  static getTimelineEventTypeFromAction(
    action: WorkflowTransitionAction
  ): WorkflowTimelineEventType {
    const eventMap: Record<WorkflowTransitionAction, WorkflowTimelineEventType> = {
      assign: "assigned",
      start: "started",
      submit: "submitted",
      review: "reviewed",
      approve: "approved",
      reject: "rejected",
      request_revision: "revision_requested",
      complete: "completed",
      cancel: "cancelled",
      mark_overdue: "overdue",
      block: "blocked",
      unblock: "unblocked",
      reopen: "reopened",
    };

    return eventMap[action];
  }

  static resolveNotificationRecipients(
    item: WorkflowItem,
    rules: WorkflowNotificationRule[],
    event?: WorkflowTimelineEvent
  ): WorkflowNotificationRecipient[] {
    const matchedRules = rules.filter((rule) => workflowNotificationRuleMatches(rule, item, event));
    const recipients = matchedRules.flatMap((rule) => rule.recipients);

    if (recipients.length > 0) {
      return this.dedupeNotificationRecipients(recipients);
    }

    if (item.assignee) {
      return [
        {
          id: item.assignee.id,
          type: item.assignee.type,
          label: item.assignee.label,
          role: item.assignee.role,
          outletId: item.assignee.outletId,
        },
      ];
    }

    return [];
  }

  static dedupeNotificationRecipients(recipients: WorkflowNotificationRecipient[]) {
    const recipientMap = new Map<string, WorkflowNotificationRecipient>();

    recipients.forEach((recipient) => {
      recipientMap.set(`${recipient.type}-${recipient.id}`, recipient);
    });

    return Array.from(recipientMap.values());
  }

  static createNotificationFromEvent(args: {
    item: WorkflowItem;
    event: WorkflowTimelineEvent;
    rules?: WorkflowNotificationRule[];
  }): WorkflowNotification | undefined {
    const { item, event, rules = [] } = args;
    const recipients = this.resolveNotificationRecipients(item, rules, event);

    if (recipients.length === 0) return undefined;

    return createWorkflowNotification({
      item,
      type: getWorkflowNotificationTypeFromEvent(event),
      priority: item.priority === "critical" ? "critical" : "normal",
      title: event.title,
      message:
        event.description ?? `${item.title} has workflow event: ${event.type.replace(/_/g, " ")}.`,
      recipients,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
      },
    });
  }

  static createNotificationFromSla(args: {
    item: WorkflowItem;
    evaluation: WorkflowSlaEvaluation;
    rules?: WorkflowNotificationRule[];
  }): WorkflowNotification | undefined {
    const { item, evaluation, rules = [] } = args;

    if (evaluation.status !== "due_soon" && evaluation.status !== "overdue") {
      return undefined;
    }

    const recipients = this.resolveNotificationRecipients(item, rules);

    if (recipients.length === 0) return undefined;

    const isOverdue = evaluation.status === "overdue";

    return createWorkflowNotification({
      item,
      type: isOverdue ? "sla_overdue" : "sla_due_soon",
      priority: getWorkflowNotificationPriorityFromSla(evaluation),
      title: isOverdue ? "Workflow SLA Overdue" : "Workflow SLA Due Soon",
      message: isOverdue
        ? `${item.title} is overdue by ${evaluation.overdueMinutes ?? 0} minutes.`
        : `${item.title} is due in ${evaluation.remainingMinutes ?? 0} minutes.`,
      recipients,
      metadata: {
        dueAt: evaluation.dueAt,
        remainingMinutes: evaluation.remainingMinutes,
        overdueMinutes: evaluation.overdueMinutes,
      },
    });
  }

  static createInboxItems(args: {
    items: WorkflowItem[];
    currentUserId?: string;
    filter?: WorkflowInboxFilter;
    sortBy?: WorkflowInboxSort;
  }): WorkflowInboxItem[] {
    const { items, currentUserId, filter, sortBy } = args;

    const inboxItems = items
      .map((item) => createWorkflowInboxItem(item, currentUserId))
      .filter((item) => workflowInboxItemMatchesFilter(item, filter));

    return sortWorkflowInboxItems(inboxItems, sortBy);
  }

  static getInboxSummary(items: WorkflowInboxItem[]) {
    return {
      total: items.length,
      myTasks: items.filter((item) => item.bucket === "my_tasks").length,
      teamTasks: items.filter((item) => item.bucket === "team_tasks").length,
      review: items.filter((item) => item.bucket === "review").length,
      overdue: items.filter((item) => item.bucket === "overdue").length,
      blocked: items.filter((item) => item.bucket === "blocked").length,
      completed: items.filter((item) => item.bucket === "completed").length,
    };
  }
}
