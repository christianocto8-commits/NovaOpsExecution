"use client";

import { useCallback, useRef } from "react";
import { useClickOutside, useEscapeKey } from "@/shared/hooks";

type OutletExportCardProps = {
  outlet: string;
  totalReports: number;
  averageScore: string;
  flaggedIssues: number;
  lastUpdated: string;
  isOpen: boolean;
  onToggle: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
};

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
    >
      {children}
    </button>
  );
}

export function OutletExportCard({
  outlet,
  totalReports,
  averageScore,
  flaggedIssues,
  lastUpdated,
  isOpen,
  onToggle,
  onExportExcel,
  onExportPdf,
  onExportCsv,
}: OutletExportCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const closeCard = useCallback(() => {
    if (isOpen) {
      onToggle();
    }
  }, [isOpen, onToggle]);

  useClickOutside(cardRef, closeCard, { enabled: isOpen });
  useEscapeKey(closeCard, isOpen);

  return (
    <div
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-950">{outlet}</p>
          <p className="mt-1 text-xs text-slate-500">
            {totalReports} reports • Avg score {averageScore} • Updated {lastUpdated}
          </p>
        </div>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-transform duration-500 ease-in-out ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      <div
        className={`grid transition-all duration-500 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 bg-slate-50/60 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Reports</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{totalReports}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Average Score</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{averageScore}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Flagged</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{flaggedIssues}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Last Updated</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{lastUpdated}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Export</p>
                <p className="mt-0.5 text-sm font-medium text-slate-700">Download outlet report</p>
              </div>

              <div className="flex items-center gap-2">
                <IconButton label="Export Excel" onClick={onExportExcel}>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M8 13h8" />
                    <path d="M8 17h8" />
                    <path d="M8 9h2" />
                  </svg>
                </IconButton>

                <IconButton label="Export PDF" onClick={onExportPdf}>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
                    <path d="M14 2v5h5" />
                    <path d="M8 15h8" />
                    <path d="M8 18h5" />
                    <path d="M8 11h3" />
                  </svg>
                </IconButton>

                <IconButton label="Export CSV" onClick={onExportCsv}>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 9h16" />
                    <path d="M9 4v16" />
                    <path d="M14 4v16" />
                  </svg>
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
