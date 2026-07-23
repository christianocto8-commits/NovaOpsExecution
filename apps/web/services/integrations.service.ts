import { api } from "@/services/api";

export type IntegrationChannelStatus = {
  configured?: boolean;
  enabled?: boolean;
  enabled_on_login?: boolean;
  issuer?: string | null;
  entity_id?: string | null;
  live_ready?: boolean;
  setup_steps?: string[];
  capacitor_android?: boolean;
  fcm_configured?: boolean;
  fcm_send_ready?: boolean;
  formats?: string[];
};

export type IntegrationsStatus = {
  google_oauth: IntegrationChannelStatus & { configured: boolean; enabled_on_login: boolean };
  oidc_sso: IntegrationChannelStatus & { configured: boolean; issuer: string | null };
  saml_sso: IntegrationChannelStatus & { configured: boolean; entity_id: string | null };
  sms_twilio: IntegrationChannelStatus & { configured: boolean; enabled: boolean };
  web_push_vapid: IntegrationChannelStatus & { configured: boolean };
  webhooks: IntegrationChannelStatus & { enabled: boolean };
  native_push: IntegrationChannelStatus & { capacitor_android: boolean; fcm_configured: boolean };
  video_evidence: IntegrationChannelStatus & { enabled: boolean; formats: string[] };
  iot_sensors: IntegrationChannelStatus & { enabled: boolean; live_ready: boolean };
  lms_training: IntegrationChannelStatus & { enabled: boolean; live_ready: boolean };
};

export async function fetchIntegrationsStatus() {
  return api<IntegrationsStatus>("/api/v1/integrations/status");
}

export type SmsTestResponse = {
  success: boolean;
  simulated: boolean;
  message: string;
  phone_number?: string | null;
};

export async function testSmsIntegration(phoneNumber?: string) {
  return api<SmsTestResponse>("/api/v1/integrations/sms/test", {
    method: "POST",
    body: JSON.stringify({ phone_number: phoneNumber ?? null }),
  });
}
