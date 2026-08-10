"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  FileCheck,
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

type TaskEvidenceItem = {
  id: string;
  task_title: string;
  outlet_name: string;
  submitted_at: string;
  image_url: string;
  note?: string;
  ai_status: string;
  ai_score: number;
};

const SAMPLE_SUBMISSIONS: TaskEvidenceItem[] = [
  {
    id: "task-239",
    task_title: "Evening - Espresso checklist",
    outlet_name: "KOV HERITAGE",
    submitted_at: "Hari ini, 18:30",
    image_url: "/uploads/evidence/sample_pos.jpg",
    note: "Mesin grinder & group head espresso telah dibersihkan & di-backflush.",
    ai_status: "verified",
    ai_score: 96,
  },
  {
    id: "task-238",
    task_title: "Evening - Mixo Station & Bar Back",
    outlet_name: "KOV HERITAGE",
    submitted_at: "Hari ini, 17:45",
    image_url: "/uploads/evidence/sample_chiller.jpg",
    note: "Area bar back & peralatan mixologi sudah disterilkan.",
    ai_status: "verified",
    ai_score: 94,
  },
  {
    id: "task-236",
    task_title: "Opening - Espresso Checklist",
    outlet_name: "KOV HERITAGE",
    submitted_at: "Hari ini, 07:15",
    image_url: "/uploads/evidence/sample_blank.jpg",
    note: "Pengecekan suhu air & tekanan pompa espresso.",
    ai_status: "verified",
    ai_score: 91,
  },
];

export default function AIAuditPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [testNote, setTestNote] = useState("Semua peralatan dalam kondisi bersih & siap pakai.");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskEvidenceItem | null>(SAMPLE_SUBMISSIONS[0]);

  const [submissions, setSubmissions] = useState<TaskEvidenceItem[]>(SAMPLE_SUBMISSIONS);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      runDirectAudit(url);
    }
  };

  const runDirectAudit = async (targetUrl?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/evidence/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("novaops_token") ?? ""}`,
        },
        body: JSON.stringify({
          evidence_url: targetUrl || previewUrl || activeTask?.image_url || "/uploads/sample.jpg",
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
    fetch("/api/v1/tasks?status=completed&limit=10", {
      headers: { Authorization: `Bearer ${localStorage.getItem("novaops_token") ?? ""}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveItems: TaskEvidenceItem[] = data.map((t: any) => ({
            id: t.id,
            task_title: t.title || t.template_title || "Tugas Outlet",
            outlet_name: t.outlet_name || "Outlet Main",
            submitted_at: t.completed_at
              ? new Date(t.completed_at).toLocaleTimeString()
              : "Baru saja",
            image_url: t.evidence_url || "/uploads/evidence/sample_pos.jpg",
            note: t.notes || "Pengerjaan selesai.",
            ai_status: t.evidence_verified ? "verified" : "needs_review",
            ai_score: t.evidence_score ?? 90,
          }));
          setSubmissions([...liveItems, ...SAMPLE_SUBMISSIONS]);
          setActiveTask(liveItems[0]);
          runDirectAudit(liveItems[0].image_url);
        } else {
          runDirectAudit(SAMPLE_SUBMISSIONS[0].image_url);
        }
      })
      .catch(() => {
        runDirectAudit(SAMPLE_SUBMISSIONS[0].image_url);
      });
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
          Verifikasi otomatis foto bukti eksekusi tugas dari seluruh outlet tanpa perlu memasukkan
          URL manual.
        </p>
      </div>

      {/* Main AI Auditor Section: Upload Direct Photo OR Select Recent Submission */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Col: Upload / Select Sample */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="size-5 text-emerald-600" />
              1. Uji Foto Bukti (Upload Langsung dari Perangkat)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Pilih foto bukti dari galeri HP / komputer Anda untuk dianalisis oleh AI Auditor
              secara instan.
            </p>

            <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400/60 bg-emerald-50/30 p-6 text-center transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50/80 active:scale-[0.99] cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="direct-photo-upload"
              />
              <label
                htmlFor="direct-photo-upload"
                className="cursor-pointer flex flex-col items-center w-full min-h-[52px] justify-center"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-700 mb-2 shadow-sm">
                  <ImageIcon className="size-7 text-emerald-700" />
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {selectedFile ? selectedFile.name : "Klik / Drop Foto dari Perangkat"}
                </span>
                <span className="mt-1 text-xs font-semibold text-emerald-800">
                  Mendukung format JPG, PNG, WEBP
                </span>
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Catatan Pengerjaan Staf
              </label>
              <input
                type="text"
                value={testNote}
                onChange={(e) => setTestNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 min-h-[44px] text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Recent Submissions Feed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="size-5 text-emerald-600" />
              2. Pilih Bukti dari Setoran Tugas Outlet Terbaru
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Klik salah satu tugas di bawah ini untuk melihat hasil audit verifikasi AI secara
              otomatis:
            </p>

            <div className="mt-4 space-y-3">
              {submissions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveTask(item);
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    if (item.note) setTestNote(item.note);
                    runDirectAudit(item.image_url);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    activeTask?.id === item.id
                      ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                      FOTO
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.task_title}</p>
                      <p className="text-[11px] text-slate-500">
                        {item.outlet_name} • {item.submitted_at}
                      </p>
                    </div>
                  </div>
                  <AIEvidenceBadge status={item.ai_status} confidenceScore={item.ai_score} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: AI Analysis Card Output */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Hasil Analisis AI Auditor</h3>
              </div>
              {loading && <RefreshCw className="size-4 animate-spin text-emerald-400" />}
            </div>

            {/* Photo Preview */}
            <div className="mt-4 overflow-hidden rounded-xl border border-emerald-800/80 bg-slate-950/60 p-2 text-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview Upload"
                  className="max-h-48 w-full object-cover rounded-lg"
                />
              ) : (
                <div className="flex h-36 flex-col items-center justify-center rounded-lg bg-emerald-950/30 text-emerald-300">
                  <ImageIcon className="size-8 opacity-60" />
                  <span className="mt-2 text-xs font-medium text-emerald-200">
                    {activeTask ? activeTask.task_title : "Foto Terpilih"}
                  </span>
                </div>
              )}
            </div>

            {auditResult ? (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-3 border border-emerald-900/60">
                  <span className="text-xs text-slate-300">Status Verifikasi</span>
                  <AIEvidenceBadge
                    status={auditResult.status}
                    confidenceScore={auditResult.confidence_score}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-3 border border-emerald-900/60">
                  <span className="text-xs text-slate-300">Skor Kepercayaan AI</span>
                  <span className="text-lg font-black text-emerald-400">
                    {auditResult.confidence_score}%
                  </span>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3 border border-emerald-900/60">
                  <span className="text-xs font-bold text-emerald-300 block mb-2">
                    Catatan Audit & Pertimbangan AI:
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                    {auditResult.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-center text-xs text-slate-400">
                Pilih foto tugas di sebelah kiri untuk melihat hasil analisis AI.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Features Grid */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
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
            AI memverifikasi foto bukti pengerjaan task, mendeteksi foto kosong/blank, dan menandai
            bukti yang mencurigakan.
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
