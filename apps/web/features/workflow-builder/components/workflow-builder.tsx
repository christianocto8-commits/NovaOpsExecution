"use client";

import { Check, ChevronLeft, Cloud, CloudAlert, LoaderCircle, Play, Save } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { WorkflowBuilderProvider } from "@/features/workflow-builder/context/workflow-builder-provider";
import { useWorkflowBuilder } from "@/features/workflow-builder/hooks/use-workflow-builder";

import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowProperties } from "./workflow-properties";
import { WorkflowStatusBar } from "./workflow-status-bar";
import { WorkflowToolbox } from "./workflow-toolbox";

function WorkflowBuilderContent() {
  const {
    workflowName,
    documentId,
    documentStatus,
    isDirty,
    isLoadingDocument,
    backendConnected,
    autosaveStatus,
    lastSavedAt,
    updateWorkflowName,
    saveDraftNow,
    publishWorkflow,
  } = useWorkflowBuilder();

  function renderSaveStatus() {
    if (isLoadingDocument) {
      return (
        <>
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Loading workflow...</span>
        </>
      );
    }

    if (autosaveStatus === "saving") {
      return (
        <>
          <LoaderCircle className="size-3.5 animate-spin" />
          <span>Saving to backend...</span>
        </>
      );
    }

    if (autosaveStatus === "error") {
      return (
        <>
          <CloudAlert className="size-3.5 text-red-600" />
          <span className="text-red-700">Backend save failed</span>
        </>
      );
    }

    if (isDirty) {
      return (
        <>
          <Cloud className="size-3.5" />
          <span>Unsaved changes</span>
        </>
      );
    }

    return (
      <>
        <Check className="size-3.5 text-emerald-600" />
        <span>
          {lastSavedAt
            ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : backendConnected
              ? "Synced with backend"
              : "Ready"}
        </span>
      </>
    );
  }

  const statusLabel = documentStatus === "published" ? "Published" : documentId ? "Draft" : "New";

  return (
    <main className="flex h-[calc(100vh-72px)] min-h-[720px] flex-col overflow-hidden">
      <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard/workflows"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Back to workflows"
          >
            <ChevronLeft className="size-5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflowName}
                onChange={(event) => updateWorkflowName(event.target.value)}
                className="min-w-0 max-w-72 border-0 bg-transparent p-0 text-base font-semibold text-slate-950 outline-none"
                aria-label="Workflow name"
              />

              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  documentStatus === "published"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {statusLabel}
              </span>

              {documentId ? (
                <span className="text-[11px] font-medium text-slate-400">#{documentId}</span>
              ) : null}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              {renderSaveStatus()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void saveDraftNow()}
            disabled={!isDirty || autosaveStatus === "saving" || isLoadingDocument}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-4" />
            Save draft
          </button>

          <button
            type="button"
            onClick={() => void publishWorkflow()}
            disabled={autosaveStatus === "saving" || isLoadingDocument}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#274733] px-3 text-sm font-semibold text-white transition hover:bg-[#1f3929] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="size-4" />
            Publish workflow
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_300px]">
        <WorkflowToolbox />

        <section className="min-w-0">
          <WorkflowCanvas />
        </section>

        <WorkflowProperties />
      </div>

      <WorkflowStatusBar />
    </main>
  );
}

function WorkflowBuilderShell() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("document");

  return (
    <WorkflowBuilderProvider documentId={documentId}>
      <WorkflowBuilderContent />
    </WorkflowBuilderProvider>
  );
}

export function WorkflowBuilder() {
  return <WorkflowBuilderShell />;
}
