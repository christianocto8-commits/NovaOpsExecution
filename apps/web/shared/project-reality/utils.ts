import { NOVAOPS_REAL_PROJECT_TASKS } from "./data";
import {
  ProjectModuleSummary,
  ProjectReportRow,
  ProjectSprintSummary,
  ProjectSummary,
  ProjectTask,
} from "./types";

export function getProjectSummary(
  tasks: ProjectTask[] = NOVAOPS_REAL_PROJECT_TASKS
): ProjectSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
  const plannedTasks = tasks.filter((task) => task.status === "planned").length;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    plannedTasks,
    completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
}

export function getCompletedProjectTasks() {
  return NOVAOPS_REAL_PROJECT_TASKS.filter((task) => task.status === "completed");
}

export function getActiveProjectTasks() {
  return NOVAOPS_REAL_PROJECT_TASKS.filter((task) => task.status !== "completed");
}

export function getProjectTasksBySprint(sprint: string) {
  return NOVAOPS_REAL_PROJECT_TASKS.filter((task) => task.sprint === sprint);
}

export function getProjectSprintSummaries(
  tasks: ProjectTask[] = NOVAOPS_REAL_PROJECT_TASKS
): ProjectSprintSummary[] {
  const sprintMap = new Map<string, ProjectTask[]>();

  tasks.forEach((task) => {
    sprintMap.set(task.sprint, [...(sprintMap.get(task.sprint) ?? []), task]);
  });

  return Array.from(sprintMap.entries()).map(([sprint, sprintTasks]) => {
    const summary = getProjectSummary(sprintTasks);

    return {
      sprint,
      total: summary.totalTasks,
      completed: summary.completedTasks,
      inProgress: summary.inProgressTasks,
      planned: summary.plannedTasks,
      completionPercentage: summary.completionPercentage,
    };
  });
}

export function getProjectModuleSummaries(
  tasks: ProjectTask[] = NOVAOPS_REAL_PROJECT_TASKS
): ProjectModuleSummary[] {
  const moduleMap = new Map<string, ProjectTask[]>();

  tasks.forEach((task) => {
    moduleMap.set(task.module, [...(moduleMap.get(task.module) ?? []), task]);
  });

  return Array.from(moduleMap.entries()).map(([module, moduleTasks]) => {
    const summary = getProjectSummary(moduleTasks);

    return {
      module,
      total: summary.totalTasks,
      completed: summary.completedTasks,
      inProgress: summary.inProgressTasks,
      planned: summary.plannedTasks,
      completionPercentage: summary.completionPercentage,
    };
  });
}

export function getProjectStatusDistribution(tasks: ProjectTask[] = NOVAOPS_REAL_PROJECT_TASKS) {
  const summary = getProjectSummary(tasks);

  return [
    { name: "Completed", value: summary.completedTasks },
    { name: "In Progress", value: summary.inProgressTasks },
    { name: "Planned", value: summary.plannedTasks },
  ];
}

export function getProjectReportRows(
  tasks: ProjectTask[] = NOVAOPS_REAL_PROJECT_TASKS
): ProjectReportRow[] {
  return tasks.map((task, index) => ({
    id: `PRJ-${String(index + 1).padStart(3, "0")}`,
    sprint: task.sprint,
    module: task.module,
    task: task.title,
    status:
      task.status === "completed"
        ? "Completed"
        : task.status === "in_progress"
          ? "In Progress"
          : "Planned",
    score: task.status === "completed" ? "100%" : task.status === "in_progress" ? "50%" : "0%",
    submittedBy: "NovaOps Project Engine",
    submittedAt: "Realtime",
  }));
}

export function getCurrentProjectSprint() {
  const summaries = getProjectSprintSummaries();

  return summaries[summaries.length - 1]?.sprint ?? "-";
}

export function getProjectReadinessLabel() {
  const summary = getProjectSummary();

  if (summary.completionPercentage >= 90) return "Backend Ready";

  if (summary.completionPercentage >= 70) return "Workflow Ready";

  if (summary.completionPercentage >= 40) return "Frontend Stabilizing";

  return "Foundation";
}
