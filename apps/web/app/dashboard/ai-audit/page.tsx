"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Search,
  Filter,
  Camera,
} from "lucide-react";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import { AIEvidenceBadge } from "@/features/evidence/components/ai-evidence-badge";

type AuditResult = {
  status: string;
  confidence_score: number;
  reasons: string[];
  tags: string[];
  audited_at: string;
};

export default function AIAuditPage() {
  const [testUrl, setTestUrl] = useState("/uploads/evidence/task_photo_123.jpg");
  const [testNote, setTestNote] = useState("Semua peralatan bersih dan siap digunakan.");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTestAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/evidence/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("novaops_token") ?? ""}`,
        },
        body: JSON.stringify({
          evidence_url: testUrl,
          context_note: testNote,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setAuditResult(json);
      }
    } catch (err) {
      console.error("Failed to run AI audit", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTestAudit();
  }, []);

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">Intelligence System</p>
        <h1 className="text-2xl font-semibold text-slate-950 flex items-center gap-2">
          <Sparkles className="size-6 text-emerald-600" />
          AI Audit & Evidence Verification Center
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Pusat verifikasi otomatis foto bukti eksekusi task, skor kepercayaan AI, dan pemantauan
          anomali kepatuhan outlet.
        </p>
      </div>

      {/* AI Inspector Card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 backdrop-blur-md">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white">AI Real-Time Inspector</h2>
            <p className="text-xs text-emerald-200/80">
              Uji langsung pengujian verifikasi foto bukti eksekusi task dengan AI Auditor.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-emerald-200">
                URL Foto Bukti Task
              </label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-800/80 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="/uploads/evidence/sample.jpg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-200">
                Catatan Staf (Context Note)
              </label>
              <input
                type="text"
                value={testNote}
                onChange={(e) => setTestNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-800/80 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Catatan pengerjaan..."
              />
            </div>
            <button
              type="button"
              onClick={runTestAudit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Menganalisis..." : "Jalankan Audit AI"}
            </button>
          </div>

          {/* Audit Output Box */}
          <div className="rounded-xl border border-emerald-800/60 bg-slate-950/80 p-4 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Hasil Analisis AI
            </p>
            {auditResult ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2">
                  <span className="text-xs text-slate-400">Status Verifikasi</span>
                  <AIEvidenceBadge
                    status={auditResult.status}
                    confidenceScore={auditResult.confidence_score}
                  />
                </div>
                <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2">
                  <span className="text-xs text-slate-400">Skor Kepercayaan (Confidence)</span>
                  <span className="text-sm font-black text-emerald-400">
                    {auditResult.confidence_score}%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Catatan Audit AI:</span>
                  <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                    {auditResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-500">
                Tekan tombol di samping untuk menjalankan pengujian AI.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Features Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">Validasi Foto Bukti</h3>
              <p className="text-xs text-slate-500">Otomatisasi 100%</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            AI memverifikasi struktur file foto, mendeteksi foto kosong/blank, dan menandai bukti
            yang mencurigakan.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">Deteksi Anomali</h3>
              <p className="text-xs text-slate-500">Real-time Signals</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Sistem mendeteksi tren pengerjaan task yang tidak wajar atau kegagalan checklist
            berturut-turut di outlet.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900">Smart CAPA Recommendation</h3>
              <p className="text-xs text-slate-500">Auto Task Action</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Rekomendasi tindakan korektif otomatis ketika inspeksi/checklist mengalami kegagalan
            standar operasional.
          </p>
        </div>
      </div>
    </main>
  );
}
