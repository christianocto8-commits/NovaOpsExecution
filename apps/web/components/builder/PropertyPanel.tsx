"use client";

import { useBuilder } from "./hooks/useBuilder";

type BuilderState = ReturnType<typeof useBuilder>;

type Props = {
  builder: BuilderState;
};

export function PropertyPanel({ builder }: Props) {
  const selectedField = builder.selectedField;
  const selectedSection = builder.selectedSection;

  return (
    <aside className="overflow-auto rounded-xl bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-[#1E1E1E]">Properties</h3>

      {selectedField ? (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Field Properties</p>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Label</label>

            <input
              value={selectedField.label}
              onChange={(e) => builder.updateField(selectedField.id, "label", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Field Type</label>

            <select
              value={selectedField.field_type}
              onChange={(e) => builder.updateField(selectedField.id, "field_type", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              {builder.fieldTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Placeholder</label>

            <input
              value={selectedField.placeholder ?? ""}
              onChange={(e) => builder.updateField(selectedField.id, "placeholder", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Help Text</label>

            <textarea
              rows={3}
              value={selectedField.help_text ?? ""}
              onChange={(e) => builder.updateField(selectedField.id, "help_text", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selectedField.is_required}
              onChange={(e) =>
                builder.updateField(selectedField.id, "is_required", e.target.checked)
              }
            />
            Required
          </label>

          <button
            onClick={() => builder.removeField(selectedField.id)}
            className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Remove Field
          </button>
        </div>
      ) : selectedSection ? (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Section Properties</p>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Title</label>

            <input
              value={selectedSection.title}
              onChange={(e) => builder.updateSection(selectedSection.id, "title", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Description</label>

            <textarea
              rows={3}
              value={selectedSection.description ?? ""}
              onChange={(e) =>
                builder.updateSection(selectedSection.id, "description", e.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-400">
          Select a section or field.
        </div>
      )}
    </aside>
  );
}
