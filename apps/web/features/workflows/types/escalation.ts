import type { UUID } from "./workflow";

export interface WorkflowEscalationRule {
  id: UUID;
  workflow_id: UUID;
  step_order?: number | null;
  name?: string | null;
  trigger_after_minutes?: number | null;
  escalate_to_role_id?: UUID | null;
  escalate_to_user_id?: UUID | null;
  notification_template_id?: UUID | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowEscalationRuleCreate {
  workflow_id: UUID;
  step_order?: number | null;
  name?: string | null;
  trigger_after_minutes?: number | null;
  escalate_to_role_id?: UUID | null;
  escalate_to_user_id?: UUID | null;
  notification_template_id?: UUID | null;
  is_active?: boolean;
}

export interface WorkflowEscalationRuleUpdate {
  step_order?: number | null;
  name?: string | null;
  trigger_after_minutes?: number | null;
  escalate_to_role_id?: UUID | null;
  escalate_to_user_id?: UUID | null;
  notification_template_id?: UUID | null;
  is_active?: boolean;
}

export interface WorkflowEscalationProcessResult {
  processed?: number;
  escalated?: number;
  [key: string]: unknown;
}
