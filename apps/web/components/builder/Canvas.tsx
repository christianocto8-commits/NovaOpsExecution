"use client";

import { useBuilder } from "./hooks/useBuilder";

type BuilderState = ReturnType<typeof useBuilder>;

type Props = {
  builder: BuilderState;
};

export function Canvas({ builder }: Props) {
  return (
    <section className="overflow-auto rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6 space-y-4">
        <input
          value={builder.document.metadata.title}
          onChange={(e) => builder.updateMetadata("title", e.target.value)}
          className="w-full border-b pb-2 text-2xl font-bold outline-none"
        />

        <textarea
          value={builder.document.metadata.description}
          onChange={(e) => builder.updateMetadata("description", e.target.value)}
          className="w-full rounded-lg border p-3 text-sm outline-none"
          rows={3}
        />
      </div>

      <div className="space-y-6">
        {builder.document.sections.map((section) => (
          <div
            key={section.id}
            onClick={() => {
              builder.setSelectedSectionId(section.id);
              builder.setSelectedFieldId(null);
            }}
            className={`rounded-xl border p-5 transition ${
              builder.selectedSectionId === section.id && !builder.selectedFieldId
                ? "border-[#3D6B49] bg-[#F7FAF8]"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#274733]">{section.title}</h3>
              <p className="text-sm text-gray-500">{section.description}</p>
            </div>

            <div className="space-y-3">
              {section.fields.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-400">
                  No fields in this section.
                </div>
              ) : (
                section.fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      builder.setSelectedSectionId(section.id);
                      builder.setSelectedFieldId(field.id);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      builder.selectedFieldId === field.id
                        ? "border-[#3D6B49] bg-[#EAF1EC]"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#1E1E1E]">
                      {field.label}
                      {field.is_required && <span className="text-red-500"> *</span>}
                    </p>

                    {field.help_text && (
                      <p className="mt-1 text-xs text-gray-500">{field.help_text}</p>
                    )}

                    <p className="mt-2 text-xs text-gray-400">Type: {field.field_type}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
