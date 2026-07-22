import { api } from "@/services/api";

export type IntegrationsStatus = {
  google_oauth: { configured: boolean; enabled_on_login: boolean };
  oidc_sso: { configured: boolean; issuer: string | null };
  sms_twilio: { configured: boolean; enabled: boolean };
  web_push_vapid: { configured: boolean };
  webhooks: { enabled: boolean };
  native_push: { capacitor_android: boolean; fcm_configured: boolean };
  saml_sso: { configured: boolean; entity_id: string | null };
  video_evidence: { enabled: boolean; formats: string[] };
};

export async function fetchIntegrationsStatus() {
  return api<IntegrationsStatus>("/api/v1/integrations/status");
}
