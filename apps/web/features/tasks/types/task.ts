export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  outlet: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  description: string;
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
