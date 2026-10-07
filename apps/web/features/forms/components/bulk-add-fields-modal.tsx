"use client";

import { useMemo, useState } from "react";
import { ListPlus, Sparkles } from "lucide-react";
import { Modal } from "@/shared/ui/overlay/modal";
import { createLocalId } from "@/lib/local-id";
import type { FormField, FormFieldType } from "../types";

type BulkAddFieldsModalProps = {
  open: boolean;
  onClose: () => void;
  onAddFields: (fields: FormField[]) => void;
};

const BULK_TYPE_OPTIONS: Array<{ value: FormFieldType; label: string }> = [
  { value: "yes_no", label: "Ya / Tidak (Checklist Cepat)" },
  { value: "photo", label: "Foto Bukti" },
  { value: "text", label: "Teks Singkat" },
  { value: "number", label: "Angka / Nilai" },
];

export function BulkAddFieldsModal({
  open,
  onClose,
  onAddFields,
}: BulkAddFieldsModalProps) {
  const [rawText, setRawText] = useState("");
  const [fieldType, setFieldType] = useState<FormFieldType>("yes_no");
  const [sectionName, setSectionName] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  // Clean and parse lines
  const parsedLines = useMemo(() => {
    return rawText
      .split("\n")
      .map((line) => {
        // Strip bullet points, numbering like "1. ", "1) ", "- ", "• "
        return line
          .replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "")
          .trim();
      })
      .filter((line) => line.length > 0);
  }, [rawText]);

  function handleImport() {
    if (parsedLines.length === 0) return;

    const newFields: FormField[] = parsedLines.map((label) => ({
      id: `local-field-${createLocalId()}`,
      label,
      type: fieldType,
      required: isRequired,
      section: sectionName.trim() ? sectionName.trim() : undefined,
    }));

    onAddFields(newFields);
    setRawText("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick Paste / Bulk Add Pertanyaan (Zenput-Style)"
      description="Paste daftar pertanyaan dari Excel, Word, atau SOP teks. Sistem akan langsung memecahnya menjadi item checklist otomatis dalam 1 detik."
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <p className="text-xs text-slate-500">
            {parsedLines.length > 0 ? (
              <span className="font-semibold text-emerald-700">
                {parsedLines.length} pertanyaan terdeteksi
              </span>
            ) : (
              "Tempel teks checklist di atas"
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={parsedLines.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <ListPlus className="size-3.5" />
              <span>Tambahkan {parsedLines.length} Pertanyaan</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Text Area */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Daftar Pertanyaan (1 Baris = 1 Pertanyaan)
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={7}
            placeholder={`Contoh:\n1. Lampu dan AC menyala normal\n2. Suhu chiller di bawah 4 derajat\n3. Wastafel bersih dan sabun terisi\n4. Seluruh tempat sampah kosong`}
            className="w-full rounded-2xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            autoFocus
          />
        </div>

        {/* Options */}
        <div className="grid gap-3 sm:grid-cols-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipe Pertanyaan
            </label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FormFieldType)}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              {BULK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Bagian / Seksi (Opsional)
            </label>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Misal: Dapur / Kasir"
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="size-4 accent-emerald-700 rounded"
              />
              <span>Set semua pertanyaan sebagai Wajib Diisi (Required)</span>
            </label>

            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <Sparkles className="size-3" /> Auto strip numbering
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
