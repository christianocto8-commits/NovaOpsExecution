import type {
  UUID,
  WorkflowEscalationRule,
  WorkflowEscalationRuleCreate,
  WorkflowEscalationRuleUpdate,
} from "@/features/workflows/types";

export type EscalationRuleFormState = {
  step_order: string;
  name: string;
  trigger_after_minutes: string;
  escalate_to_role_id: string;
  escalate_to_user_id: string;
  notification_template_id: string;
  is_active: boolean;
};

export const emptyEscalationRuleForm: EscalationRuleFormState = {
  step_order: "1",
  name: "",
  trigger_after_minutes: "120",
  escalate_to_role_id: "",
  escalate_to_user_id: "",
  notification_template_id: "",
  is_active: true,
};

export function escalationRuleToForm(rule: WorkflowEscalationRule): EscalationRuleFormState {
  return {
    step_order: String(rule.step_order ?? 1),
    name: rule.name ?? "",
    trigger_after_minutes: String(rule.trigger_after_minutes ?? 120),
    escalate_to_role_id: rule.escalate_to_role_id ?? "",
    escalate_to_user_id: rule.escalate_to_user_id ?? "",
    notification_template_id: rule.notification_template_id ?? "",
    is_active: rule.is_active ?? true,
  };
}

export function buildEscalationRuleCreatePayload(
  workflowId: UUID,
  form: EscalationRuleFormState
): WorkflowEscalationRuleCreate {
  return {
    workflow_id: workflowId,
    step_order: Number(form.step_order || 1),
    name: form.name.trim() || null,
    trigger_after_minutes: Number(form.trigger_after_minutes || 120),
    escalate_to_role_id: form.escalate_to_role_id.trim() || null,
    escalate_to_user_id: form.escalate_to_user_id.trim() || null,
    notification_template_id: form.notification_template_id.trim() || null,
    is_active: form.is_active,
  };
}

export function buildEscalationRuleUpdatePayload(
  form: EscalationRuleFormState
): WorkflowEscalationRuleUpdate {
  return {
    step_order: Number(form.step_order || 1),
    name: form.name.trim() || null,
    trigger_after_minutes: Number(form.trigger_after_minutes || 120),
    escalate_to_role_id: form.escalate_to_role_id.trim() || null,
    escalate_to_user_id: form.escalate_to_user_id.trim() || null,
    notification_template_id: form.notification_template_id.trim() || null,
    is_active: form.is_active,
  };
}
