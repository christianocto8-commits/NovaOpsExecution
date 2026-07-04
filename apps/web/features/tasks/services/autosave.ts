import { api } from "@/services/api";

import { AutoSavePayload } from "../types/autosave";

export async function autoSaveDraft(payload: AutoSavePayload) {
  return api("/drafts/auto-save", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
