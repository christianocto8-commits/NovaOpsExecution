import { Task } from "@/features/tasks/types";

const weeklyDayLabels: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export function formatTaskDue(value: string) {
  if (!value) return "-";

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

export function formatTaskSchedule(
  task: Pick<
    Task,
    "due" | "publishTime" | "dueTime" | "recurrence" | "weeklyPublishDay" | "monthlyPublishDay"
  >
) {
  const publish = task.publishTime || "-";
  const due = task.dueTime || task.due || "-";

  if (task.recurrence === "daily") {
    return `Daily publish ${publish}, due ${due}`;
  }

  if (task.recurrence === "weekly") {
    const publishDay = weeklyDayLabels[task.weeklyPublishDay ?? "sunday"] ?? "Sunday";
    return `Weekly ${publishDay} publish ${publish}, due ${due}`;
  }

  if (task.recurrence === "monthly") {
    return `Monthly day ${task.monthlyPublishDay ?? 1} publish ${publish}, due ${due}`;
  }

  return formatTaskDue(task.due);
}

export function getPriorityClass(priority: string) {
  switch (priority) {
    case "High":
      return "border-red-200 bg-red-50 text-red-700";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function getStatusClass(status: string) {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "In Progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}
