"use client";

import { publishBuilderDocument, saveBuilderDocument } from "@/services/builder.service";
import { useAuth } from "@/hooks/useAuth";
import { useBuilder } from "./hooks/useBuilder";

type BuilderState = ReturnType<typeof useBuilder>;

type Props = {
  builder: BuilderState;
};

export function BuilderHeader({ builder }: Props) {
  const { can } = useAuth();

  async function handleSaveTemplate() {
    try {
      const result = await saveBuilderDocument({
        title: builder.document.metadata.title,
        description: builder.document.metadata.description,
        version: builder.document.metadata.version,
        status: builder.document.metadata.status,
        document_json: builder.document,
        created_by: null,
      });

      builder.setBuilderDocumentId(result.id);

      alert(`Template saved successfully. ID: ${result.id}`);
    } catch (error) {
      console.error(error);
      alert("Failed to save template");
    }
  }

  async function handlePublishTemplate() {
    if (!builder.builderDocumentId) {
      alert("Save draft first before publishing.");
      return;
    }

    if (!can("builder.publish")) {
      alert("You do not have permission to publish templates.");
      return;
    }

    try {
      await publishBuilderDocument(builder.builderDocumentId);
      builder.setDocumentStatus("published");

      alert("Template published successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to publish template");
    }
  }

  return (
    <div className="mb-5 flex items-center justify-between rounded-xl bg-white px-6 py-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-[#3D6B49]">NovaOps Builder</p>
        <h2 className="text-2xl font-bold text-[#1E1E1E]">Document Model</h2>

        <div className="mt-1 flex gap-3 text-xs text-gray-500">
          <span>Status: {builder.document.metadata.status}</span>

          {builder.builderDocumentId && <span>Draft ID: {builder.builderDocumentId}</span>}
        </div>
      </div>

      <div className="flex gap-2">
        {can("builder.create") && (
          <button
            type="button"
            onClick={builder.addSection}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            + Add Section
          </button>
        )}

        {can("builder.edit") && (
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="rounded-lg bg-[#274733] px-5 py-2 text-sm font-medium text-white hover:bg-[#3D6B49]"
          >
            Save Draft
          </button>
        )}

        {can("builder.publish") && (
          <button
            type="button"
            onClick={handlePublishTemplate}
            disabled={!builder.builderDocumentId}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Publish
          </button>
        )}
      </div>
    </div>
  );
}
