export type OutletTaskFormStatus =
  | "Pending"
  | "Draft"
  | "Submitted"
  | "Completed"
  | "Overdue";

export type OutletTaskFormReport = {
  id: string;
  outlet: string;
  task: string;
  form: string;
  status: OutletTaskFormStatus;
  progress: number;
  score: number;
  operator: string;
  due: string;
  submittedAt: string;
  updatedAt: string;
};
