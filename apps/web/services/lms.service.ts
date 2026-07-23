import { api } from "@/services/api";

export type TrainingModule = {
  id: string;
  title: string;
  description?: string | null;
  content_url?: string | null;
  duration_minutes: number;
  required_for_roles?: string[] | null;
  expires_days?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MyTrainingItem = {
  module: TrainingModule;
  completed: boolean;
  completed_at?: string | null;
  expires_at?: string | null;
  required: boolean;
};

export async function listTrainingModules() {
  return api<TrainingModule[]>("/api/v1/lms/modules");
}

export async function createTrainingModule(payload: {
  title: string;
  description?: string;
  content_url?: string;
  duration_minutes?: number;
  required_for_roles?: string[];
  expires_days?: number;
}) {
  return api<TrainingModule>("/api/v1/lms/modules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTrainingModule(
  moduleId: string,
  payload: Partial<{
    title: string;
    description: string;
    content_url: string;
    duration_minutes: number;
    required_for_roles: string[];
    expires_days: number;
    is_active: boolean;
  }>,
) {
  return api<TrainingModule>(`/api/v1/lms/modules/${moduleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTrainingModule(moduleId: string) {
  return api<void>(`/api/v1/lms/modules/${moduleId}`, { method: "DELETE" });
}

export async function listMyTraining() {
  return api<MyTrainingItem[]>("/api/v1/lms/my-training");
}

export async function completeTrainingModule(moduleId: string) {
  return api<{ id: string }>("/api/v1/lms/completions", {
    method: "POST",
    body: JSON.stringify({ module_id: moduleId }),
  });
}

export async function hasIncompleteRequiredTraining() {
  const items = await listMyTraining();
  return items.some((item) => item.required && !item.completed);
}
