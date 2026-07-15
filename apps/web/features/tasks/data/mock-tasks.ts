import { Task, TaskExecutionForm, TaskFormState } from "../types";

export const emptyTaskForm: TaskFormState = {
  title: "",
  outlet: "KOV Montre",
  status: "Pending",
  priority: "Medium",
  assignee: "",
  due: "2026-07-04T09:00",
  description: "",
  formTemplateId: "FORM-OPENING",
  recurrence: "once",
  shifts: ["morning"],
  targetOutlets: ["KOV Montre"],
  autoPublish: false,
};

export const emptyTaskExecutionForm: TaskExecutionForm = {
  operatorName: "",
  operatorPosition: "Crew",
  note: "",
  evidenceText: "",
  formResponses: {},
};

export const mockTasks: Task[] = [
  {
    id: "TASK-001",
    title: "Test Form - Daily Opening Checklist",
    outlet: "KOV Montre",
    status: "Pending",
    priority: "High",
    assignee: "Outlet Team",
    due: "2026-07-04T09:00",
    description: "Test task untuk mencoba isi form, save draft, continue, dan submit final.",
    formTemplateId: "FORM-OPENING",
    recurrence: "daily",
    shifts: ["morning"],
    targetOutlets: ["KOV Montre"],
    autoPublish: true,
    activity: [
      {
        id: "ACT-001-created",
        type: "created",
        title: "Task created",
        description: "Daily Opening Checklist assigned to KOV Montre.",
        actor: "Owner/Admin",
        timestamp: "Today",
      },
    ],
  },
  {
    id: "TASK-002",
    title: "Espresso machine cleaning audit",
    outlet: "KOV Heritage",
    status: "Pending",
    priority: "Medium",
    assignee: "Outlet Team",
    due: "2026-07-04T17:00",
    description: "Audit espresso machine cleaning and backflush compliance.",
    formTemplateId: "FORM-CLEANING",
    recurrence: "daily",
    shifts: ["evening"],
    targetOutlets: ["KOV Heritage"],
    autoPublish: true,
  },
];
