export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";
export type TaskPriority = "Low" | "Medium" | "High";

export type TaskEvidence = {
  id: string;
  type: "photo" | "note";
  value: string;
  submittedAt: string;
};

export type TaskExecution = {
  operatorName: string;
  operatorPosition: "Head Barista" | "Lead Barista" | "Crew";
  note: string;
  evidence: TaskEvidence[];
  completedAt: string | null;
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
};

export type TaskExecutionFormState = {
  operatorName: string;
  operatorPosition: "Head Barista" | "Lead Barista" | "Crew";
  note: string;
  evidenceText: string;
};
