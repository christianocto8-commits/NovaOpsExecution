"use client";

import { useState } from "react";
import type {
  BuilderDocument,
  BuilderField,
  BuilderSection,
} from "../types/builder";

export const fieldTypes = [
  "text",
  "textarea",
  "number",
  "yes_no",
  "temperature",
  "photo",
  "signature",
  "score",
  "date",
  "time",
];

export function useBuilder() {
  // ==========================
  // Builder Document
  // ==========================

  const [builderDocumentId, setBuilderDocumentId] = useState<number | null>(
    null
  );

  const [document, setDocument] = useState<BuilderDocument>({
    metadata: {
      title: "Opening Checklist",
      description: "Daily opening operational checklist",
      formType: "checklist",
      status: "draft",
      version: 1,
    },
    sections: [
      {
        id: Date.now(),
        title: "Opening Section",
        description: "Checklist before outlet operation starts",
        fields: [],
      },
    ],
  });

  // ==========================
  // Selection
  // ==========================

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    document.sections[0]?.id ?? null
  );

  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);

  const selectedSection = document.sections.find(
    (section) => section.id === selectedSectionId
  );

  const selectedField = document.sections
    .flatMap((section) => section.fields)
    .find((field) => field.id === selectedFieldId);

  // ==========================
  // Metadata
  // ==========================

  function updateMetadata(
    key: keyof BuilderDocument["metadata"],
    value: string | number
  ) {
    setDocument((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        [key]: value,
      },
    }));
  }

  function setDocumentStatus(status: "draft" | "published") {
    setDocument((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        status,
      },
    }));
  }

  // ==========================
  // Section
  // ==========================

  function addSection() {
    const newSection: BuilderSection = {
      id: Date.now(),
      title: "Untitled Section",
      description: "",
      fields: [],
    };

    setDocument((current) => ({
      ...current,
      sections: [...current.sections, newSection],
    }));

    setSelectedSectionId(newSection.id);
    setSelectedFieldId(null);
  }

  function updateSection(
    sectionId: number,
    key: keyof BuilderSection,
    value: string
  ) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [key]: value,
            }
          : section
      ),
    }));
  }

  // ==========================
  // Field
  // ==========================

  function addField(field_type: string) {
    if (!selectedSectionId) return;

    const newField: BuilderField = {
      id: Date.now(),
      label: "Untitled Field",
      field_type,
      is_required: false,
      placeholder: "",
      help_text: "",
    };

    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              fields: [...section.fields, newField],
            }
          : section
      ),
    }));

    setSelectedFieldId(newField.id);
  }

  function updateField(
    id: number,
    key: keyof BuilderField,
    value: string | boolean
  ) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) =>
          field.id === id
            ? {
                ...field,
                [key]: value,
              }
            : field
        ),
      })),
    }));
  }

  function removeField(id: number) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.id !== id),
      })),
    }));

    setSelectedFieldId(null);
  }

  // ==========================
  // Return
  // ==========================

  return {
    document,
    builderDocumentId,

    selectedSection,
    selectedSectionId,

    selectedField,
    selectedFieldId,

    fieldTypes,

    updateMetadata,
    setDocumentStatus,

    addSection,
    updateSection,

    addField,
    updateField,
    removeField,

    setBuilderDocumentId,

    setSelectedSectionId,
    setSelectedFieldId,
  };
}