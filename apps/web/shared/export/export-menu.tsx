"use client";

import { useState } from "react";

type ExportMenuProps = {
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  disabled?: boolean;
};

export function ExportMenu({
  onExportExcel,
  onExportPdf,
  onExportCsv,
  onPrint,
  disabled = false,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleAction(action?: () => void) {
    if (!action || disabled) return;

    action();
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Export
        <span className="ml-2 text-xs">▼</span>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => handleAction(onExportExcel)}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Excel
          </button>

          <button
            type="button"
            onClick={() => handleAction(onExportPdf)}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            PDF Report
          </button>

          <button
            type="button"
            onClick={() => handleAction(onExportCsv)}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            CSV
          </button>

          <button
            type="button"
            onClick={() => handleAction(onPrint)}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Print Report
          </button>
        </div>
      ) : null}
    </div>
  );
}