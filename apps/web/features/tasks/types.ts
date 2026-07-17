export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskRecurrence = "once" | "daily" | "weekly";
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
  category: "Opening" | "Closing" | "Cleaning" | "Inventory" | "Audit";
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
};

export type Task = {
  id: string;
  title: string;
  outlet: string;
  outletId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  description: string;
  formTemplateId?: string;
  recurrence?: TaskRecurrence;
  shifts?: TaskShift[];
  targetOutlets?: string[];
  targetOutletIds?: string[];
  autoPublish?: boolean;
  dueTime?: string;
  weeklyPublishDay?: TaskWeeklyPublishDay;
  activity?: TaskActivity[];
  executionDraft?: TaskExecutionForm;
  execution?: TaskExecution;
};

export type TaskFormState = {
  title: string;
  outlet: string;
  outletId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  description: string;
  formTemplateId: string;
  recurrence: TaskRecurrence;
  shifts: TaskShift[];
  targetOutlets: string[];
  targetOutletIds?: string[];
  autoPublish: boolean;
  dueTime: string;
  weeklyPublishDay: TaskWeeklyPublishDay;
};