"use client";

import { FormField } from "@/features/forms/types";
import { TaskFormResponses } from "@/features/tasks/types";

import { MoneyAmountField } from "./money-amount-field";
import { MoneyDenominationField } from "./money-denomination-field";
import { PhotoFieldInput } from "./photo-field-input";
import { SignatureFieldInput } from "./signature-field-input";

type DynamicFormRendererProps = {
  fields: FormField[];
  responses: TaskFormResponses;
  onChange: (responses: TaskFormResponses) => void;
  readOnly?: boolean;
  highlightedFieldIds?: string[];
};

const fieldTypeLabels: Partial<Record<FormField["type"], string>> = {
  text: "Text singkat",
  textarea: "Kotak teks",
  yes_no: "Ya / Tidak",
  number: "Angka",
  photo: "Foto bukti",
  signature: "Tanda tangan",
  money_denomination: "Hitung denom uang",
  money_amount: "Nominal uang",
  responsible_person: "Nama pelaksana",
};

export function DynamicFormRenderer({
  fields,
  responses,
  onChange,
  readOnly = false,
  highlightedFieldIds = [],
}: DynamicFormRendererProps) {
  function updateResponse(fieldId: string, value: string) {
    onChange({
      ...responses,
      [fieldId]: value,
    });
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = responses[field.id] ?? "";
        const isHighlighted = highlightedFieldIds.includes(field.id);
        const typeLabel = fieldTypeLabels[field.type] ?? field.type.toUpperCase();

        return (
          <div
            key={field.id}
            data-form-field-id={field.id}
            className={`rounded-2xl border bg-white p-4 transition-all duration-300 ${
              isHighlighted ? "border-red-300 bg-red-50 ring-2 ring-red-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <label className="text-sm font-bold text-slate-800">{field.label}</label>
                <p className="mt-1 text-xs text-slate-400">
                  {typeLabel}
                  {field.required ? " • Wajib diisi" : " • Opsional"}
                </p>
              </div>
            </div>

            <div className="mt-3">
              {field.type === "yes_no" ? (
                <div className="grid grid-cols-2 gap-2">
                  {["Yes", "No"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={readOnly}
                      onClick={() => updateResponse(field.id, option)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                        value === option
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      } disabled:cursor-not-allowed`}
                    >
                      {option === "Yes" ? "Ya" : "Tidak"}
                    </button>
                  ))}
                </div>
              ) : field.type === "textarea" ? (
                <textarea
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  rows={4}
                  placeholder="Tulis catatan atau jawaban di sini..."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              ) : field.type === "number" ? (
                <input
                  type="number"
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              ) : field.type === "money_denomination" ? (
                <MoneyDenominationField
                  field={field}
                  value={value}
                  readOnly={readOnly}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "money_amount" ? (
                <MoneyAmountField
                  value={value}
                  readOnly={readOnly}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "photo" ? (
                <PhotoFieldInput
                  value={value}
                  readOnly={readOnly}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "signature" ? (
                <SignatureFieldInput
                  value={value}
                  readOnly={readOnly}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "responsible_person" ? (
                <input
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  placeholder="Masukkan nama yang mengerjakan tugas ini..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              ) : (
                <input
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  placeholder="Tulis jawaban singkat..."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
