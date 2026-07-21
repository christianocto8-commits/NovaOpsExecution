import { api } from "@/services/api";

export type BulkImportRowResult = {
  row: number;
  entity: string;
  identifier: string;
  status: "created" | "skipped" | "error" | string;
  message: string | null;
};

export type BulkImportResponse = {
  outlets_created: number;
  outlets_skipped: number;
  users_created: number;
  users_skipped: number;
  rows: BulkImportRowResult[];
};

export async function uploadBulkImport(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return api<BulkImportResponse>("/api/v1/identity/bulk-import", {
    method: "POST",
    body: formData,
  });
}
