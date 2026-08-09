export type TaskStatus = "Pending" | "In Progress" | "Blocked" | "Completed" | "Cancelled";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskRecurrence = "once" | "daily" | "weekly" | "monthly";
export type TaskShift = "morning" | "evening" | "midnight";
export type TaskWeeklyPublishDay =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type TaskPriorityFilter = TaskPriority | "All";
export type TaskStatusFilter = TaskStatus | "All";

export type OperatorPosition = "Crew" | "Senior Barista" | "Lead Barista" | "Head Barista";

export type TaskEvidenceType = "note" | "url" | "photo" | "document";

export type TaskEvidence = {
  id: string;
  type: TaskEvidenceType;
  label?: string;
  value: string;
  submittedAt: string;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
};

export type TaskFormFieldType =
  | "text"
  | "textarea"
  | "yes_no"
  | "number"
  | "photo"
  | "signature"
  | "money_denomination"
  | "money_amount"
  | "responsible_person";

export type TaskFormField = {
  id: string;
  label: string;
  type: TaskFormFieldType;
  required: boolean;
  helpText?: string;
};

export type TaskFormTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: TaskFormField[];
};

export type TaskFormResponseValue = string;

export type TaskFormResponses = Record<string, TaskFormResponseValue>;

export type TaskActivityType =
  | "created"
  | "assigned"
  | "updated"
  | "draft_saved"
  | "form_submitted"
  | "evidence_submitted"
  | "review_approved"
  | "review_rejected"
  | "completed";

export type TaskReviewStatus = "pending_review" | "approved" | "rejected";

export type TaskActivity = {
  id: string;
  type: TaskActivityType;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
};

export type ChecklistFailedItem = {
  field_id: number;
  label: string;
  value: string | null;
  reason: string;
  critical?: boolean;
};

export type ChecklistScore = {
  score: number;
  passed_count: number;
  failed_count: number;
  total_scorable: number;
  na_count?: number;
  failed_items: ChecklistFailedItem[];
  critical_failures?: ChecklistFailedItem[];
  status: "pass" | "attention" | "fail";
};

export type TaskExecutionForm = {
  operatorName: string;
  operatorPosition: OperatorPosition;
  note: string;
  evidenceText: string;
  formResponses: TaskFormResponses;
};

export type TaskExecution = {
  operatorName: string;
  operatorPosition: OperatorPosition;
  note: string;
  evidence: TaskEvidence[];
  formResponses: TaskFormResponses;
  completedAt: string;
  reviewStatus?: TaskReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  checklist?: ChecklistScore;
};

export type TaskAssigneeSelection = "outlet_team" | "area_manager" | `user:${number}`;

export type Task = {
  id: string;
  title: string;
  outlet: string;
  outletId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  assignedToId?: number | null;
  due: string;
  description: string;
  formTemplateId?: string;
  formTemplateName?: string;
  checklistFieldCount?: number;
  checklistPreview?: string[];
  sourceType?: string;
  sourceId?: string;
  backendStatus?: "open" | "in_progress" | "blocked" | "completed" | "cancelled";
  expiredAt?: string;
  verifiedAt?: string;
  approvedAt?: string;
  capaRootCause?: string;
  capaBeforeEvidenceUrl?: string;
  capaAfterEvidenceUrl?: string;
  capaEvidenceNote?: string;
  recurrence?: TaskRecurrence;
  shifts?: TaskShift[];
  targetOutlets?: string[];
  targetOutletIds?: string[];
  autoPublish?: boolean;
  publishTime?: string;
  dueTime?: string;
  weeklyPublishDay?: TaskWeeklyPublishDay;
  monthlyPublishDay?: number;
  activity?: TaskActivity[];
  executionDraft?: TaskExecutionForm;
  execution?: TaskExecution;
  isUpcoming?: boolean;
  publishAt?: string;
  lockedReason?: string;
};

export type TaskFormState = {
  title: string;
  outlet: string;
  outletId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  assignedToId?: number | null;
  assigneeSelection?: TaskAssigneeSelection;
  due: string;
  publishAt: string;
  description: string;
  formTemplateId: string;
  recurrence: TaskRecurrence;
  shifts: TaskShift[];
  targetOutlets: string[];
  targetOutletIds?: string[];
  autoPublish: boolean;
  publishTime: string;
  dueTime: string;
  weeklyPublishDay: TaskWeeklyPublishDay;
  monthlyPublishDay: number;
};
