import { api } from "@/services/api";

export type ApiKeyRecord = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type ApiKeyCreated = ApiKeyRecord & {
  raw_key: string;
};

export type ApiKeyCreatePayload = {
  name: string;
  scopes: string[];
};

export const apiKeyService = {
  list() {
    return api<ApiKeyRecord[]>("/api/v1/api-keys");
  },

  create(payload: ApiKeyCreatePayload) {
    return api<ApiKeyCreated>("/api/v1/api-keys", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  revoke(id: string) {
    return api<void>(`/api/v1/api-keys/${id}`, {
      method: "DELETE",
    });
  },
};
