import {
  WORKSPACE_SETTINGS_DEFAULTS,
  type SettingsResponse,
} from "@/features/settings/settings-api";

export function isCapaEnabled(settings?: Pick<SettingsResponse, "auto_corrective_action"> | null) {
  return settings?.auto_corrective_action ?? WORKSPACE_SETTINGS_DEFAULTS.auto_corrective_action;
}
