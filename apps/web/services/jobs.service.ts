import { api } from "@/services/api";

export type SchedulerJobRun = {
  id: number;
  job_name: string;
  status: string;
  duration_ms: number;
  result_json: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

export const jobsService = {
  async listRuns(limit = 50) {
    return api<SchedulerJobRun[]>(`/api/v1/jobs/runs?limit=${limit}`);
  },
};
