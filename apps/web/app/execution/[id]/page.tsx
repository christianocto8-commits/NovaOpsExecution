"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getRuntimeTemplate, type RuntimeTemplate } from "@/services/runtime-template.service";
import { createExecutionSession } from "@/services/execution-session.service";

type RuntimeField = {
  id: number;
  label: string;
  field_type: string;
  is_required?: boolean;
  placeholder?: string;
  help_text?: string;
};

type RuntimeSection = {
  id: number;
  title: string;
  description?: string;
  fields: RuntimeField[];
};

type RuntimeJson = {
  sections?: RuntimeSection[];
};

function RuntimeInput({
  field,
  value,
  onChange,
}: {
  field: RuntimeField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.field_type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
        rows={3}
      />
    );
  }

  if (
    field.field_type === "number" ||
    field.field_type === "score" ||
    field.field_type === "temperature"
  ) {
    return (
      <input
        type="number"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
      />
    );
  }

  if (field.field_type === "yes_no") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-lg border px-4 py-2 text-sm ${
            value === true ? "bg-[#274733] text-white" : ""
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-lg border px-4 py-2 text-sm ${
            value === false ? "bg-red-600 text-white" : ""
          }`}
        >
          No
        </button>
      </div>
    );
  }

  return (
    <input
      type={field.field_type === "date" ? "date" : field.field_type === "time" ? "time" : "text"}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
    />
  );
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [template, setTemplate] = useState<RuntimeTemplate | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const data = await getRuntimeTemplate(id);
        setTemplate(data);
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isNaN(id)) loadTemplate();
  }, [id]);

  const runtime = template?.runtime_json as RuntimeJson | undefined;
  const sections = runtime?.sections ?? [];

  async function handleSubmit() {
    if (!template) return;

    await createExecutionSession({
      runtime_template_id: template.id,
      status: "completed",
      answers_json: answers,
      submitted_by: null,
    });

    alert("Execution submitted successfully");
  }

  return (
    <main className="flex min-h-screen bg-[#F7FAF8]">
      <Sidebar />

      <section className="flex-1 p-8">
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !template ? (
          <p className="text-sm text-red-500">Runtime template not found.</p>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-sm font-medium text-[#3D6B49]">Execution Form</p>
              <h2 className="text-3xl font-bold text-[#1E1E1E]">{template.title}</h2>
              <p className="mt-2 text-gray-500">
                Version {template.version} • {template.status}
              </p>
            </div>

            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id} className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-[#274733]">{section.title}</h3>

                  <div className="mt-5 space-y-4">
                    {section.fields.map((field) => (
                      <div key={field.id} className="rounded-lg border p-4">
                        <label className="mb-2 block text-sm font-semibold">
                          {field.label}
                          {field.is_required && <span className="text-red-500"> *</span>}
                        </label>

                        <RuntimeInput
                          field={field}
                          value={answers[String(field.id)]}
                          onChange={(value) =>
                            setAnswers((current) => ({
                              ...current,
                              [String(field.id)]: value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-lg bg-[#274733] px-6 py-3 text-sm font-medium text-white"
              >
                Submit Execution
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
