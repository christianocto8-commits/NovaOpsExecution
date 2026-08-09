"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, MailCheck, PackageOpen, Save } from "lucide-react";

import {
  downloadAuditBundle,
  downloadComplianceExport,
  getScheduledReportConfig,
  sendComplianceDigestNow,
  updateScheduledReportConfig,
  type ScheduledReportConfig,
} from "@/services/reports.service";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { useToast } from "@/shared/toast";

const defaultConfig: ScheduledReportConfig = {
  enabled: false,
  frequency: "daily",
  format: "pdf",
  include_evidence_bundle: true,
  recipients: [],
  last_sent_at: null,
};

export default function ReportAutomationPage() {
  const toast = useToast();
  const configQuery = useQuery({
    queryKey: ["reports", "scheduled"],
    queryFn: getScheduledReportConfig,
    retry: false,
  });
  const [form, setForm] = useState<ScheduledReportConfig>(defaultConfig);
  const [recipientText, setRecipientText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!configQuery.data) return;
    setForm(configQuery.data);
    setRecipientText(configQuery.data.recipients.join(", "));
  }, [configQuery.data]);

  async function saveConfig() {
    setIsSaving(true);
    try {
      const recipients = recipientText
        .split(",")
        .map((recipient) => recipient.trim())
        .filter(Boolean);
      const saved = await updateScheduledReportConfig({ ...form, recipients });
      setForm(saved);
      toast.success("Scheduled report config saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save scheduled report.");
    } finally {
      setIsSaving(false);
    }
  }

  async function exportNow(format: "pdf" | "xlsx") {
    setIsExporting(true);
    try {
      await downloadComplianceExport(format);
      toast.success(`Compliance ${format.toUpperCase()} prepared.`);
    } finally {
      setIsExporting(false);
    }
  }

  async function exportBundle() {
    setIsExporting(true);
    try {
      await downloadAuditBundle(30);
      toast.success("Evidence bundle prepared.");
    } finally {
      setIsExporting(false);
    }
  }

  async function sendDigest() {
    const result = await sendComplianceDigestNow();
    toast.success(result.sent ? `Digest sent to ${result.delivered} recipients.` : result.reason);
  }

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">Report Automation</p>
        <h1 className="text-2xl font-semibold text-slate-950">Scheduled Reports</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Configure scheduled compliance report delivery and export audit-ready evidence bundles.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Schedule config</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            Enabled
          </label>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.frequency}
            onChange={(event) =>
              setForm((current) => ({ ...current, frequency: event.target.value }))
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.format}
            onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))}
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.include_evidence_bundle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  include_evidence_bundle: event.target.checked,
                }))
              }
            />
            Include evidence bundle
          </label>
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
            placeholder="Recipients, comma separated"
            value={recipientText}
            onChange={(event) => setRecipientText(event.target.value)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveConfig()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            <Save className="size-4" />
            {isSaving ? "Saving..." : "Save schedule"}
          </button>
          {form.last_sent_at ? (
            <p className="self-center text-sm text-slate-500">
              Last sent: {new Date(form.last_sent_at).toLocaleString()}
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="PDF report"
          detail="Audit-ready compliance report."
          onClick={() => exportNow("pdf")}
          disabled={isExporting}
          icon={Download}
        />
        <ActionCard
          title="Excel report"
          detail="Spreadsheet export for BI and area review."
          onClick={() => exportNow("xlsx")}
          disabled={isExporting}
          icon={Download}
        />
        <ActionCard
          title="Evidence bundle"
          detail="ZIP with manifest, CSV audit rows, and evidence files."
          onClick={exportBundle}
          disabled={isExporting}
          icon={PackageOpen}
        />
        <ActionCard
          title="Send digest now"
          detail="Trigger compliance digest immediately."
          onClick={sendDigest}
          disabled={isExporting}
          icon={MailCheck}
        />
      </section>
    </main>
  );
}

function ActionCard({
  title,
  detail,
  onClick,
  disabled,
  icon: Icon,
}: {
  title: string;
  detail: string;
  onClick: () => Promise<void>;
  disabled: boolean;
  icon: typeof Download;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 disabled:opacity-60"
    >
      <Icon className="size-5 text-emerald-700" />
      <p className="mt-3 font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </button>
  );
}
