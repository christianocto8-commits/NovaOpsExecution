import { Task, TaskFormState } from "../types";

export const emptyTaskForm: TaskFormState = {
  title: "",
  outlet: "KOV Montre",
  status: "Pending",
  priority: "Medium",
  assignee: "",
  due: "Today",
  description: "",
};

export const mockTasks: Task[] = [
  {
    id: "TASK-001",
    title: "Daily opening checklist",
    outlet: "KOV Montre",
    status: "In Progress",
    priority: "High",
    assignee: "Lead Barista",
    due: "Today",
    description: "Complete daily opening standards and submit evidence.",
  },
  {
    id: "TASK-002",
    title: "Espresso machine cleaning audit",
    outlet: "KOV Heritage",
    status: "Pending",
    priority: "Medium",
    assignee: "Senior Barista",
    due: "Tomorrow",
    description: "Audit espresso machine cleaning and backflush compliance.",
  },
  {
    id: "TASK-003",
    title: "Inventory variance review",
    outlet: "KOV Sultan Agung",
    status: "Completed",
    priority: "Low",
    assignee: "Head Barista",
    due: "Yesterday",
    description: "Review inventory variance and submit correction notes.",
  },
];
