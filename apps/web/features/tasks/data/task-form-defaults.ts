import { TaskExecutionForm, TaskFormState } from "../types";

export const emptyTaskForm: TaskFormState = {
  title: "",
  outlet: "",
  outletId: "",
  status: "Pending",
  priority: "Medium",
  assignee: "",
  due: "",
  dueTime: "",
  weeklyPublishDay: "sunday",
  description: "",
  formTemplateId: "",
  recurrence: "once",
  shifts: ["morning"],
  targetOutlets: [],
  targetOutletIds: [],
  autoPublish: false,
};

export const emptyTaskExecutionForm: TaskExecutionForm = {
  operatorName: "",
  operatorPosition: "Crew",
  note: "",
  evidenceText: "",
  formResponses: {},
};
