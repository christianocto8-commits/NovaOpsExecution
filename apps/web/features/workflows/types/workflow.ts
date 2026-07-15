export type UUID = string;

export type WorkflowStatus = "draft" | "published" | "archived" | "active" | "inactive" | string;

export interface WorkflowStep {
  id?: UUID;
  workflow_id?: UUID;
  code: string;
  name: string;
  step_type: string;
  position?: number;
  config_json?: Record<string, unknown> | null;
}

export interface WorkflowStepCreate {
  code: string;
  name: string;
  step_type: string;
  position?: number;
  config_json?: Record<string, unknown> | null;
}

export interface WorkflowDefinition {
  id: UUID;
  code: string;
  name: string;
  description?: string | null;
  module: string;
  status: WorkflowStatus;
  version?: number;
  is_active?: boolean;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  steps?: WorkflowStep[];
}

export interface WorkflowDefinitionCreate {
  code: string;
  name: string;
  description?: string | null;
  module: string;
  metadata_json?: Record<string, unknown> | null;
  steps?: WorkflowStepCreate[];
}

export interface WorkflowDefinitionUpdate {
  name?: string;
  description?: string | null;
  module?: string;
  status?: WorkflowStatus;
  is_active?: boolean;
  metadata_json?: Record<string, unknown> | null;
}
