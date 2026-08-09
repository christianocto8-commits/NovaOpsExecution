import type { UUID } from "./workflow";

export type NotificationChannel = "in_app" | "email" | "sms" | string;
export type NotificationStatus =
  "pending" | "processing" | "sent" | "failed" | "cancelled" | string;

export interface NotificationTemplate {
  id: UUID;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject_template?: string | null;
  body_template: string;
  is_active: boolean;
  metadata_json?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationTemplateCreate {
  code: string;
  name: string;
  channel: NotificationChannel;
  subject_template?: string | null;
  body_template: string;
  is_active?: boolean;
  metadata_json?: Record<string, unknown> | null;
}

export interface NotificationTemplateUpdate {
  name?: string;
  channel?: NotificationChannel;
  subject_template?: string | null;
  body_template?: string;
  is_active?: boolean;
  metadata_json?: Record<string, unknown> | null;
}

export interface WorkflowNotificationTemplate {
  id: UUID;
  workflow_id: UUID;
  event: string;
  channel: string;
  title_template: string;
  body_template: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowNotificationTemplateCreate {
  workflow_id: UUID;
  event: string;
  channel?: string;
  title_template: string;
  body_template: string;
  enabled?: boolean;
}

export interface WorkflowNotificationTemplateUpdate {
  event?: string;
  channel?: string;
  title_template?: string;
  body_template?: string;
  enabled?: boolean;
}

export interface NotificationEventCreate {
  event_type: string;
  source_module: string;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  template_code?: string | null;
  payload_json?: Record<string, unknown> | null;
  recipient_user_id?: UUID | null;
  recipient_role_id?: UUID | null;
  channel?: NotificationChannel;
  subject?: string | null;
  body?: string | null;
}

export interface NotificationEvent {
  id: UUID;
  event_type: string;
  source_module: string;
  source_entity_type?: string | null;
  source_entity_id?: string | null;
  template_code?: string | null;
  payload_json?: Record<string, unknown> | null;
  created_by_id?: UUID | null;
  created_at?: string;
}

export interface NotificationDelivery {
  id: UUID;
  event_id: UUID;
  recipient_user_id?: UUID | null;
  recipient_role_id?: UUID | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject?: string | null;
  body: string;
  attempt_count: number;
  last_error?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
  action_url?: string | null;
}
