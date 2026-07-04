"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { FormField } from "@/features/forms/types";
import { TaskFormResponses } from "@/features/tasks/types";
import { ProgressChip, useFormProgress } from "@/shared/form-progress";

import { DynamicFormRenderer } from "./dynamic-form-renderer";

type SectionedFormRendererProps = {
  fields: FormField[];
  responses: TaskFormResponses;
  onChange: (responses: TaskFormResponses) => void;
  readOnly?: boolean;
  highlightedFieldIds?: string[];
};

type FieldSection = {
  id: string;
  title: string;
  fields: FormField[];
};

type SectionCardProps = {
  section: FieldSection;
  responses: TaskFormResponses;
  onChange: (responses: TaskFormResponses) => void;
  readOnly: boolean;
  highlightedFieldIds: string[];
  isOpen: boolean;
  onToggle: () => void;
};

function getSectionTitle(field: FormField) {
  const rawSection = "section" in field ? String(field.section ?? "") : "";

  if (rawSection.trim()) return rawSection;

  if (field.type === "photo" || field.type === "signature") {
    return "Evidence & Sign Off";
  }

  return "General Checklist";
}

function groupFieldsBySection(fields: FormField[]): FieldSection[] {
  const sectionMap = new Map<string, FormField[]>();

  fields.forEach((field) => {
    const title = getSectionTitle(field);
    const currentFields = sectionMap.get(title) ?? [];

    sectionMap.set(title, [...currentFields, field]);
  });

  return Array.from(sectionMap.entries()).map(([title, sectionFields], index) => ({
    id: `${index}-${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    fields: sectionFields,
  }));
}

function SectionCard({
  section,
  responses,
  onChange,
  readOnly,
  highlightedFieldIds,
  isOpen,
  onToggle,
}: SectionCardProps) {
  const progressFields = section.fields.map((field) => ({
    id: field.id,
    label: field.label,
    required: field.required,
  }));

  const progress = useFormProgress(progressFields, responses);

  const sectionHasHighlight = section.fields.some((field) =>
    highlightedFieldIds.includes(field.id)
  );

  return (
    <section
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 ${
        sectionHasHighlight
          ? "border-red-200 ring-2 ring-red-100"
          : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-bold text-slate-950">{section.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {section.fields.length} fields · {progress.completed} of{" "}
            {progress.total} required completed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProgressChip percentage={progress.percentage} />
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 p-4">
            <DynamicFormRenderer
              fields={section.fields}
              responses={responses}
              onChange={onChange}
              readOnly={readOnly}
              highlightedFieldIds={highlightedFieldIds}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionedFormRenderer({
  fields,
  responses,
  onChange,
  readOnly = false,
  highlightedFieldIds = [],
}: SectionedFormRendererProps) {
  const sections = useMemo(() => groupFieldsBySection(fields), [fields]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, true]))
  );

  function toggleSection(sectionId: string) {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          responses={responses}
          onChange={onChange}
          readOnly={readOnly}
          highlightedFieldIds={highlightedFieldIds}
          isOpen={openSections[section.id] ?? true}
          onToggle={() => toggleSection(section.id)}
        />
      ))}
    </div>
  );
}
