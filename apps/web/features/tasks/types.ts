export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export type OperatorPosition =
  | "Crew"
  | "Senior Barista"
  | "Lead Barista"
  | "Head Barista";

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
  | "signature";

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
  | "completed";

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
};

export type Task = {
  id: string;
  title: string;
  outlet: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  description: string;
  formTemplateId?: string;
  activity?: TaskActivity[];
  executionDraft?: TaskExecutionForm;
  execution?: TaskExecution;
};

export type TaskFormState = {
  title: string;
  outlet: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  description: string;
  formTemplateId: string;
};
