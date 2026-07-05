export type WorkflowModule =
  | "task"
  | "audit"
  | "qa"
  | "foodsafety"
  | "maintenance"
  | "inventory"
  | "equipment"
  | "incident"
  | "hr"
  | "document";

export type WorkflowPriority = "low" | "medium" | "high" | "critical";

export type WorkflowStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "approved"
  | "rejected"
  | "revision_required"
  | "completed"
  | "cancelled"
  | "overdue"
  | "blocked";

export type WorkflowStatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "purple";

export type WorkflowTransitionAction =
  | "assign"
  | "start"
  | "submit"
  | "review"
  | "approve"
  | "reject"
  | "request_revision"
  | "complete"
  | "cancel"
  | "mark_overdue"
  | "block"
  | "unblock"
  | "reopen";

export type WorkflowAssigneeType = "user" | "role" | "outlet" | "team";

export type WorkflowRole = "owner" | "admin" | "area_manager" | "outlet" | "reviewer" | "approver";

export type WorkflowSlaUnit = "minute" | "hour" | "day";

export type WorkflowSlaStatus = "none" | "on_track" | "due_soon" | "overdue";

export type WorkflowTimelineEventType =
  | "created"
  | "assigned"
  | "started"
  | "submitted"
  | "reviewed"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "completed"
  | "cancelled"
  | "overdue"
  | "blocked"
  | "unblocked"
  | "reopened"
  | "commented"
  | "evidence_added"
  | "sla_applied"
  | "updated";

export type WorkflowNotificationType =
  | "assignment"
  | "status_change"
  | "approval_required"
  | "revision_required"
  | "sla_due_soon"
  | "sla_overdue"
  | "comment"
  | "evidence"
  | "system";

export type WorkflowNotificationPriority = "low" | "normal" | "high" | "critical";

export type WorkflowInboxBucket =
  "my_tasks" | "team_tasks" | "review" | "overdue" | "blocked" | "completed" | "all";

export type WorkflowInboxSort = "priority" | "dueAt" | "updatedAt" | "createdAt";

export interface WorkflowActor {
  id: string;
  name: string;
  role?: WorkflowRole;
  outletId?: string;
}

export interface WorkflowTimelineEvent {
  id: string;
  itemId: string;
  module: WorkflowModule;
  type: WorkflowTimelineEventType;
  title: string;
  description?: string;
  actor?: WorkflowActor;
  fromStatus?: WorkflowStatus;
  toStatus?: WorkflowStatus;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface WorkflowNotificationRecipient {
  id: string;
  type: WorkflowAssigneeType;
  label?: string;
  role?: WorkflowRole;
  outletId?: string;
}

export interface WorkflowNotification {
  id: string;
  itemId: string;
  module: WorkflowModule;
  type: WorkflowNotificationType;
  priority: WorkflowNotificationPriority;
  title: string;
  message: string;
  recipients: WorkflowNotificationRecipient[];
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface WorkflowNotificationRule {
  id: string;
  module: WorkflowModule;
  eventType?: WorkflowTimelineEventType;
  status?: WorkflowStatus;
  priority?: WorkflowPriority;
  recipients: WorkflowNotificationRecipient[];
}

export interface WorkflowAssignee {
  id: string;
  type: WorkflowAssigneeType;
  label: string;
  role?: WorkflowRole;
  outletId?: string;
}

export interface WorkflowAssignmentRule {
  id: string;
  module: WorkflowModule;
  role?: WorkflowRole;
  outletId?: string;
  priority?: WorkflowPriority;
  assignee: WorkflowAssignee;
}

export interface WorkflowAssignmentResult {
  assigned: boolean;
  assignee?: WorkflowAssignee;
  reason?: string;
}

export interface WorkflowSlaPolicy {
  id: string;
  module: WorkflowModule;
  priority?: WorkflowPriority;
  outletId?: string;
  duration: number;
  unit: WorkflowSlaUnit;
  warnBeforeMinutes?: number;
}

export interface WorkflowSlaEvaluation {
  status: WorkflowSlaStatus;
  dueAt?: string;
  remainingMinutes?: number;
  overdueMinutes?: number;
  reason?: string;
}

export interface WorkflowStatusMeta {
  status: WorkflowStatus;
  label: string;
  description: string;
  tone: WorkflowStatusTone;
  isTerminal?: boolean;
  isActionable?: boolean;
}

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  action: WorkflowTransitionAction;
  label: string;
  requiresReason?: boolean;
  requiresAssignee?: boolean;
}

export interface WorkflowTransitionResult {
  allowed: boolean;
  from: WorkflowStatus;
  to?: WorkflowStatus;
  action?: WorkflowTransitionAction;
  reason?: string;
}

export interface WorkflowItem {
  id: string;
  module: WorkflowModule;
  title: string;
  status: WorkflowStatus;
  outletId?: string;
  priority?: WorkflowPriority;
  assignedTo?: string;
  assignee?: WorkflowAssignee;
  dueAt?: string;
  slaPolicyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInboxItem {
  id: string;
  item: WorkflowItem;
  bucket: WorkflowInboxBucket;
  title: string;
  subtitle?: string;
  priority: WorkflowPriority;
  status: WorkflowStatus;
  dueAt?: string;
  assignedTo?: string;
  outletId?: string;
  updatedAt: string;
}

export interface WorkflowInboxFilter {
  module?: WorkflowModule;
  bucket?: WorkflowInboxBucket;
  status?: WorkflowStatus;
  priority?: WorkflowPriority;
  outletId?: string;
  assigneeId?: string;
  search?: string;
}

export interface WorkflowInboxSummary {
  total: number;
  myTasks: number;
  teamTasks: number;
  review: number;
  overdue: number;
  blocked: number;
  completed: number;
}
