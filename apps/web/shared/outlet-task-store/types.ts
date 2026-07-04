export type OutletTaskExecutionStatus =
  | "pending"
  | "draft"
  | "submitted"
  | "completed"
  | "overdue";

export type OutletTaskStoreItem = {
  id: string;
  outlet: string;
  task: string;
  form: string;
  status: OutletTaskExecutionStatus;
  progress: number;
  score: number;
  operator: string;
  due: string;
  submittedAt: string;
  updatedAt: string;
};

export type OutletTaskStoreSummary = {
  total: number;
  pending: number;
  draft: number;
  submitted: number;
  completed: number;
  overdue: number;
  averageProgress: number;
  averageScore: number;
};
