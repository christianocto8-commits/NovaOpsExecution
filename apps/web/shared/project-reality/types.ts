export type ProjectTaskStatus = "completed" | "in_progress" | "planned";

export type ProjectTask = {
  id: string;
  title: string;
  sprint: string;
  module: string;
  status: ProjectTaskStatus;
};

export type ProjectSummary = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  plannedTasks: number;
  completionPercentage: number;
};

export type ProjectSprintSummary = {
  sprint: string;
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  completionPercentage: number;
};

export type ProjectModuleSummary = {
  module: string;
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  completionPercentage: number;
};

export type ProjectReportRow = {
  id: string;
  sprint: string;
  module: string;
  task: string;
  status: string;
  score: string;
  submittedBy: string;
  submittedAt: string;
};
