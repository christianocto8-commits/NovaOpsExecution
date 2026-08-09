"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import { FormField } from "@/features/forms/types";
import { getVisibleFields } from "@/features/forms/utils/field-visibility";
import {
  getResponsiblePersonField,
  RESPONSIBLE_PERSON_FIELD_LABEL,
  RESPONSIBLE_PERSON_RESPONSE_KEY,
  RESPONSIBLE_PERSON_SECTION,
} from "@/features/forms/utils/system-fields";
import { formatIdr, parseDigits, parseMoneyDenomination } from "@/features/forms/utils/money";
import { TaskFormResponses } from "@/features/tasks/types";
import { ProgressChip, useFormProgress } from "@/shared/form-progress";

import { DynamicFormRenderer } from "./dynamic-form-renderer";

type SectionedFormRendererProps = {
  fields: FormField[];
  responses: TaskFormResponses;
  onChange: (responses: TaskFormResponses) => void;
  readOnly?: boolean;
  highlightedFieldIds?: string[];
  hiddenFieldIds?: string[];
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
  hiddenFieldIds: string[];
  isOpen: boolean;
  onToggle: () => void;
};

function getSectionTitle(field: FormField) {
  const rawSection = "section" in field ? String(field.section ?? "") : "";

  if (rawSection.trim()) return rawSection;

  return "General Checklist";
}

function getMoneyReconciliation(fields: FormField[], responses: TaskFormResponses) {
  let setoranTotal = 0;
  let cashTotal = 0;
  let edcTotal = 0;

  fields.forEach((field) => {
    const raw = responses[field.id] ?? "";

    if (field.type === "money_denomination") {
      const parsed = parseMoneyDenomination(raw);
      setoranTotal += parsed?.total ?? 0;
      return;
    }

    if (field.type !== "money_amount") return;

    const amount = parseDigits(raw);
    const normalizedLabel = field.label.toLowerCase();

    if (normalizedLabel.includes("edc")) {
      edcTotal += amount;
      return;
    }

    if (normalizedLabel.includes("cash")) {
      cashTotal += amount;
    }
  });

  return { setoranTotal, cashTotal, edcTotal };
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
  hiddenFieldIds,
  isOpen,
  onToggle,
}: SectionCardProps) {
  const progressFields = section.fields.map((field) => ({
    id: field.id,
    label: field.label,
    required: field.required,
  }));

  const progress = useFormProgress(progressFields, responses);

  const salesTotal = useMemo(() => {
    return section.fields
      .filter((field) => field.type === "money_amount")
      .reduce((total, field) => total + parseDigits(responses[field.id] ?? ""), 0);
  }, [responses, section.fields]);

  const sectionHasHighlight = section.fields.some((field) =>
    highlightedFieldIds.includes(field.id)
  );

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 sm:rounded-3xl ${
        sectionHasHighlight ? "border-red-200 ring-2 ring-red-100" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:px-5"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">{section.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {section.fields.length} fields - {progress.completed}/{progress.total} required complete
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
          <div className="border-t border-slate-100 p-3 sm:p-4">
            <DynamicFormRenderer
              fields={section.fields}
              responses={responses}
              onChange={onChange}
              readOnly={readOnly}
              highlightedFieldIds={highlightedFieldIds}
              hiddenFieldIds={hiddenFieldIds}
            />

            {section.title === "Laporan Penjualan" && salesTotal > 0 ? (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-bold text-slate-800">
                  Total Penjualan (Cash + EDC)
                </span>
                <span className="text-base font-bold text-slate-900">{formatIdr(salesTotal)}</span>
              </div>
            ) : null}
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
  hiddenFieldIds = [],
}: SectionedFormRendererProps) {
  const visibleFields = useMemo(() => getVisibleFields(fields, responses), [fields, responses]);
  const sections = useMemo(() => groupFieldsBySection(visibleFields), [visibleFields]);
  const responsiblePersonField = useMemo(
    () => getResponsiblePersonField(visibleFields),
    [visibleFields]
  );
  const showFallbackResponsiblePerson = !responsiblePersonField;
  const responsiblePersonHighlighted = highlightedFieldIds.includes("__responsible_person__");
  const reconciliation = useMemo(
    () => getMoneyReconciliation(fields, responses),
    [fields, responses]
  );
  const hasMoneyFields = fields.some(
    (field) => field.type === "money_denomination" || field.type === "money_amount"
  );
  const variance = reconciliation.setoranTotal - reconciliation.cashTotal;

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
    <div className="space-y-3 sm:space-y-4">
      {showFallbackResponsiblePerson ? (
        <section
          data-form-field-id="__responsible_person__"
          className={`overflow-hidden rounded-2xl border bg-white shadow-sm sm:rounded-3xl ${
            responsiblePersonHighlighted
              ? "border-red-300 ring-2 ring-red-100"
              : "border-emerald-200"
          }`}
        >
          <div
            className={`border-b px-4 py-4 sm:px-5 ${
              responsiblePersonHighlighted
                ? "border-red-200 bg-red-50"
                : "border-emerald-100 bg-emerald-50"
            }`}
          >
            <p className="text-sm font-bold text-emerald-950">{RESPONSIBLE_PERSON_SECTION}</p>
            <p className="mt-1 text-xs text-emerald-800">Wajib diisi sebelum submit form.</p>
          </div>
          <div className="p-4">
            <label className="text-sm font-bold text-slate-800">
              {RESPONSIBLE_PERSON_FIELD_LABEL}
              <span className="ml-1 text-red-500">*</span>
            </label>
            <input
              value={responses[RESPONSIBLE_PERSON_RESPONSE_KEY] ?? ""}
              disabled={readOnly}
              onChange={(event) =>
                onChange({
                  ...responses,
                  [RESPONSIBLE_PERSON_RESPONSE_KEY]: event.target.value,
                })
              }
              placeholder="Masukkan nama yang mengerjakan tugas ini..."
              className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
            />
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          responses={responses}
          onChange={onChange}
          readOnly={readOnly}
          highlightedFieldIds={highlightedFieldIds}
          hiddenFieldIds={hiddenFieldIds}
          isOpen={openSections[section.id] ?? true}
          onToggle={() => toggleSection(section.id)}
        />
      ))}

      {hasMoneyFields &&
      (reconciliation.setoranTotal > 0 ||
        reconciliation.cashTotal > 0 ||
        reconciliation.edcTotal > 0) ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:rounded-3xl">
          <p className="text-sm font-bold text-amber-950">Ringkasan Rekonsiliasi</p>
          <div className="mt-3 grid gap-2 text-sm text-amber-900 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <span>Total Setoran</span>
              <span className="font-bold">{formatIdr(reconciliation.setoranTotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <span>Penjualan Cash</span>
              <span className="font-bold">{formatIdr(reconciliation.cashTotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <span>Penjualan EDC</span>
              <span className="font-bold">{formatIdr(reconciliation.edcTotal)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <span>Selisih (Setoran - Cash)</span>
              <span className="font-bold">{formatIdr(variance)}</span>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
