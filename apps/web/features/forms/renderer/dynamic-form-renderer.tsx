"use client";

import { FormField } from "@/features/forms/types";
import { getVisibleFields } from "@/features/forms/utils/field-visibility";
import { TaskFormResponses } from "@/features/tasks/types";

import { MoneyAmountField } from "./money-amount-field";
import { MoneyDenominationField } from "./money-denomination-field";
import { PhotoFieldInput } from "./photo-field-input";
import { SignatureFieldInput } from "./signature-field-input";
import { RatingFieldInput } from "./rating-field-input";
import { BarcodeFieldInput } from "./barcode-field-input";

type DynamicFormRendererProps = {
  fields: FormField[];
  responses: TaskFormResponses;
  onChange: (responses: TaskFormResponses) => void;
  readOnly?: boolean;
  highlightedFieldIds?: string[];
  hiddenFieldIds?: string[];
};

const fieldTypeLabels: Partial<Record<FormField["type"], string>> = {
  text: "Text singkat",
  textarea: "Kotak teks",
  yes_no: "Ya / Tidak",
  number: "Angka",
  select: "Dropdown / Pilihan",
  date: "Tanggal",
  time: "Waktu",
  photo: "Foto bukti",
  video: "Video bukti",
  signature: "Tanda tangan",
  rating: "Penilaian bintang",
  barcode: "Scan barcode / QR",
  money_denomination: "Hitung denom uang",
  money_amount: "Nominal uang",
  responsible_person: "Nama pelaksana",
};

type YesNoOption = "Yes" | "No" | "N/A";

function isYesNoOptionSelected(value: string, option: YesNoOption) {
  const normalizedValue = value.trim().toLowerCase();

  if (option === "Yes") {
    return ["yes", "ya", "true", "1"].includes(normalizedValue);
  }

  if (option === "No") {
    return ["no", "tidak", "false", "0"].includes(normalizedValue);
  }

  return ["n/a", "na", "tidak berlaku"].includes(normalizedValue);
}

function getYesNoOptionClass(option: YesNoOption, selected: boolean) {
  if (!selected) {
    return "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
  }

  if (option === "Yes") {
    return "border-emerald-600 bg-emerald-600 text-white shadow-sm";
  }

  if (option === "No") {
    return "border-red-600 bg-red-600 text-white shadow-sm";
  }

  return "border-slate-400 bg-slate-200 text-slate-800 shadow-sm";
}

export function DynamicFormRenderer({
  fields,
  responses,
  onChange,
  readOnly = false,
  highlightedFieldIds = [],
  hiddenFieldIds = [],
}: DynamicFormRendererProps) {
  const visibleFields = getVisibleFields(fields, responses).filter(
    (field) => !hiddenFieldIds.includes(field.id)
  );

  function updateResponse(fieldId: string, value: string) {
    onChange({
      ...responses,
      [fieldId]: value,
    });
  }

  return (
    <div className="space-y-4">
      {visibleFields.map((field) => {
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
                <div
                  className={`grid gap-2 ${field.options?.allow_na ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  {(["Yes", "No", ...(field.options?.allow_na ? (["N/A"] as const) : [])] as const).map(
                    (option) => {
                      const selected = isYesNoOptionSelected(value, option);

                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={readOnly}
                          aria-pressed={selected}
                          onClick={() => updateResponse(field.id, option)}
                          className={`rounded-xl border px-6 py-4 text-base font-bold transition-all ${getYesNoOptionClass(
                            option,
                            selected
                          )} disabled:cursor-default`}
                        >
                          {option === "Yes" ? "Ya" : option === "No" ? "Tidak" : "Tidak Berlaku"}
                        </button>
                      );
                    }
                  )}
                </div>
              ) : field.type === "textarea" ? (
                <textarea
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  rows={4}
                  placeholder="Tulis catatan atau jawaban di sini..."
                  className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
                />
              ) : field.type === "number" ? (
                <input
                  type="number"
                  value={value}
                  disabled={readOnly}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
                />
              ) : field.type === "select" ? (
                <select
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-50"
                >
                  <option value="">Pilih opsi...</option>
                  {(field.options?.choices ?? []).map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              ) : field.type === "date" ? (
                <input
                  type="date"
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
                />
              ) : field.type === "time" ? (
                <input
                  type="time"
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
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
              ) : field.type === "photo" || field.type === "video" ? (
                <PhotoFieldInput
                  value={value}
                  readOnly={readOnly}
                  mediaMode={field.type === "video" ? "video" : "photo"}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "signature" ? (
                <SignatureFieldInput
                  value={value}
                  readOnly={readOnly}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "rating" ? (
                <RatingFieldInput
                  value={value}
                  maxStars={field.options?.maxStars ?? 5}
                  lowLabel={field.options?.lowLabel}
                  highLabel={field.options?.highLabel}
                  readOnly={readOnly}
                  onChange={(nextValue) => updateResponse(field.id, nextValue)}
                />
              ) : field.type === "barcode" ? (
                <BarcodeFieldInput
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
                />
              ) : (
                <input
                  value={value}
                  disabled={readOnly}
                  onChange={(event) => updateResponse(field.id, event.target.value)}
                  placeholder="Tulis jawaban singkat..."
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-slate-50"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
