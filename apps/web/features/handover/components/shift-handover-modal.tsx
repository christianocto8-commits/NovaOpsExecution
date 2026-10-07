"use client";

import { useMemo, useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Printer,
  X,
  ShieldCheck,
  Coins,
  Sparkles,
  ClipboardCheck,
  Thermometer,
  Coffee,
  Package,
  History,
  Send,
  UserCheck,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import type { Task } from "@/features/tasks/types";
import { isTaskCompleted } from "@/features/tasks/utils/task-inbox";
import type { ShiftHandoverEntry, ShiftPeriod } from "../types";
import { shiftHandoverService } from "../services/handover.service";

type ShiftHandoverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  outletName?: string;
  outletId?: string | number;
};

function isDueToday(task: Task) {
  if (!task.due) return false;
  const due = new Date(task.due);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  return (
    due.getFullYear() === today.getFullYear() &&
    due.getMonth() === today.getMonth() &&
    due.getDate() === today.getDate()
  );
}

function isOverdue(task: Task) {
  if (!task.due || isTaskCompleted(task)) return false;
  const due = new Date(task.due);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

function formatTime(isoString?: string) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

const SHIFT_CONFIG: Record<
  ShiftPeriod,
  { label: string; time: string; badgeColor: string; icon: string }
> = {
  pagi: {
    label: "Shift Pagi",
    time: "06:00 - 14:00",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "🌅",
  },
  sore: {
    label: "Shift Sore",
    time: "14:00 - 22:00",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: "🌇",
  },
  malam: {
    label: "Shift Malam / Closing",
    time: "22:00 - Selesai",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    icon: "🌙",
  },
};

export function ShiftHandoverModal({
  isOpen,
  onClose,
  tasks,
  outletName = "Gerai Operasional",
  outletId = 1,
}: ShiftHandoverModalProps) {
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [historyList, setHistoryList] = useState<ShiftHandoverEntry[]>([]);

  // Form State
  const [shift, setShift] = useState<ShiftPeriod>("pagi");
  const [outgoingPIC, setOutgoingPIC] = useState("");
  const [openingCash, setOpeningCash] = useState("500000");
  const [actualCash, setActualCash] = useState("1750000");
  const [cashNotes, setCashNotes] = useState("");

  const [chillerTempOk, setChillerTempOk] = useState(true);
  const [chillerNote, setChillerNote] = useState("+3°C (Normal)");
  const [espressoMachineOk, setEspressoMachineOk] = useState(true);
  const [fryerOrOvenOk, setFryerOrOvenOk] = useState(true);
  const [posPrinterOk, setPosPrinterOk] = useState(true);
  const [cleanlinessStandardMet, setCleanlinessStandardMet] = useState(true);
  const [equipmentIssueNotes, setEquipmentIssueNotes] = useState("");

  const [lowStockItems, setLowStockItems] = useState("");
  const [thawingAndPrepNotes, setThawingAndPrepNotes] = useState("");
  const [operationalNotes, setOperationalNotes] = useState("");

  const [submitSuccessNotice, setSubmitSuccessNotice] = useState<string | null>(null);

  // Acknowledgment quick prompt in history tab
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [incomingPIC, setIncomingPIC] = useState("");
  const [incomingNote, setIncomingNote] = useState("");

  // Load history
  const loadHistory = () => {
    const list = shiftHandoverService.listHandovers(outletId);
    setHistoryList(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      const unsubscribe = shiftHandoverService.subscribe(loadHistory);
      return unsubscribe;
    }
  }, [isOpen, outletId]);

  const todayDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  const stats = useMemo(() => {
    const todayTasks = tasks.filter(isDueToday);
    const completedTasks = tasks.filter((t) => isTaskCompleted(t) && isDueToday(t));
    const pendingTasks = todayTasks.filter((t) => !isTaskCompleted(t));
    const overdueTasks = tasks.filter(isOverdue);

    const total = todayTasks.length;
    const rate = total > 0 ? Math.round((completedTasks.length / total) * 100) : 100;

    return {
      todayTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      rate,
    };
  }, [tasks]);

  const calculatedDiscrepancy = useMemo(() => {
    const act = Number(actualCash) || 0;
    const exp = Number(openingCash) || 0;
    return act - exp;
  }, [actualCash, openingCash]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingPIC.trim()) {
      alert("Mohon masukkan nama PIC yang menyerahkan shift.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    shiftHandoverService.submitHandover({
      outletId,
      outletName,
      shift,
      date: todayStr,
      outgoingPIC: outgoingPIC.trim(),
      cashFloat: {
        openingAmount: Number(openingCash) || 0,
        actualCash: Number(actualCash) || 0,
        discrepancy: calculatedDiscrepancy,
        notes: cashNotes.trim() || undefined,
      },
      equipment: {
        chillerTempOk,
        chillerNote: chillerNote.trim() || undefined,
        espressoMachineOk,
        fryerOrOvenOk,
        posPrinterOk,
        cleanlinessStandardMet,
        issueNotes: equipmentIssueNotes.trim() || undefined,
      },
      inventory: {
        lowStockItems: lowStockItems.trim() || "Semua stok utama mencukupi",
        thawingAndPrepNotes: thawingAndPrepNotes.trim() || "-",
      },
      operationalNotes: operationalNotes.trim() || "Operasional berjalan normal dan lancar.",
      completedTaskCount: stats.completedTasks.length,
      pendingTaskCount: stats.pendingTasks.length,
      overdueTaskCount: stats.overdueTasks.length,
      pendingTaskTitles: stats.pendingTasks.slice(0, 5).map((t) => t.title),
    });

    setSubmitSuccessNotice("Log Serah Terima Shift berhasil disimpan & dipublish!");
    loadHistory();
    setActiveTab("history");

    setTimeout(() => {
      setSubmitSuccessNotice(null);
    }, 4000);
  };

  const handleConfirmAcknowledge = (id: string) => {
    if (!incomingPIC.trim()) {
      alert("Mohon masukkan nama PIC yang menerima shift.");
      return;
    }

    shiftHandoverService.acknowledgeHandover(id, incomingPIC.trim(), incomingNote.trim());
    setAcknowledgingId(null);
    setIncomingPIC("");
    setIncomingNote("");
    loadHistory();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm print:p-0 print:bg-white overflow-y-auto">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl print:border-none print:shadow-none print:max-h-none my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 px-6 py-5 text-white print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 print:border print:border-emerald-600 print:text-emerald-800">
                <ShieldCheck className="size-3.5" />
                Buku Serah Terima Shift Digital
              </span>
              <span className="text-xs text-slate-300 print:text-slate-600">{todayDateLabel}</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white print:text-slate-950">
              {outletName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 print:hidden"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 print:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("form")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "form"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Send className="size-3.5" />
            Buat Serah Terima Shift Baru
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition ${
              activeTab === "history"
                ? "border-emerald-600 text-emerald-800 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="size-3.5" />
            Riwayat Logbook Shift ({historyList.length})
          </button>
        </div>

        {submitSuccessNotice ? (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-600" />
              {submitSuccessNotice}
            </span>
          </div>
        ) : null}

        {/* Body Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-slate-800 max-h-[calc(92vh-180px)]">
          {activeTab === "form" ? (
            <form onSubmit={handleSubmitHandover} className="space-y-6">
              {/* Shift Picker & PIC */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  1. Pemilihan Shift & Penanggung Jawab
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["pagi", "sore", "malam"] as ShiftPeriod[]).map((p) => {
                    const cfg = SHIFT_CONFIG[p];
                    const isSelected = shift === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setShift(p)}
                        className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/80 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span className="mt-1 font-bold text-sm text-slate-900">{cfg.label}</span>
                        <span className="text-[11px] text-slate-500">{cfg.time}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama PIC Outgoing (Yang Menyerahkan) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Budi Santoso (Barista)"
                      value={outgoingPIC}
                      onChange={(e) => setOutgoingPIC(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Waktu Pembuatan Handover
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${todayDateLabel} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} WIB`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Cash Float Reconciliation */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="size-4 text-emerald-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      2. Kas Laci & Rekapitulasi Tunai (Cash Float)
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      calculatedDiscrepancy === 0
                        ? "bg-emerald-100 text-emerald-800"
                        : calculatedDiscrepancy > 0
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    Selisih: {formatRupiah(calculatedDiscrepancy)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Modal Awal Kas (Laci Pagi) (Rp)
                    </label>
                    <input
                      type="number"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kas Fisik Akhir Terhitung di Laci (Rp)
                    </label>
                    <input
                      type="number"
                      value={actualCash}
                      onChange={(e) => setActualCash(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Kas (Setoran drop safe, pecahan uang kecil, atau kuitansi reimburse)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uang kecil Rp 200.000 lengkap, setoran sales tunai sudah diamankan."
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status SOP & Checklist Hari Ini */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-emerald-600" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      3. Status Eksekusi SOP Hari Ini (Live Snapshot)
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-600">
                    {stats.completedTasks.length}/{stats.todayTasks.length} Tuntas ({stats.rate}%)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="font-extrabold text-emerald-800 text-base">
                      {stats.completedTasks.length}
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold">Selesai</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="font-extrabold text-amber-800 text-base">
                      {stats.pendingTasks.length}
                    </p>
                    <p className="text-[10px] text-amber-700 font-semibold">Pending Shift Depan</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                    <p className="font-extrabold text-red-800 text-base">
                      {stats.overdueTasks.length}
                    </p>
                    <p className="text-[10px] text-red-700 font-semibold">Overdue</p>
                  </div>
                </div>

                {stats.pendingTasks.length > 0 ? (
                  <div className="rounded-xl bg-amber-50/70 border border-amber-200/60 p-3">
                    <p className="text-[11px] font-bold text-amber-900 mb-1">
                      Checklist yang dilanjutkan shift berikutnya:
                    </p>
                    <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                      {stats.pendingTasks.slice(0, 4).map((t) => (
                        <li key={t.id} className="truncate">
                          {t.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              {/* Peralatan & Fasilitas */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="size-4 text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    4. Kondisi Mesin, Chiller & Kebersihan Bar
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={chillerTempOk}
                      onChange={(e) => setChillerTempOk(e.target.checked)}
                      className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Suhu Chiller & Freezer Normal (HACCP OK)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={espressoMachineOk}
                      onChange={(e) => setEspressoMachineOk(e.target.checked)}
                      className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Mesin Kopi / Grinder / Blender Berfungsi Baik
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={posPrinterOk}
                      onChange={(e) => setPosPrinterOk(e.target.checked)}
                      className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Tablet POS & Printer Struk Normal
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={cleanlinessStandardMet}
                      onChange={(e) => setCleanlinessStandardMet(e.target.checked)}
                      className="size-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-slate-800">
                      Area Bar & Meja Pelanggan Bersih & Rapi
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Suhu Chiller
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chiller +3°C, Freezer -18°C"
                      value={chillerNote}
                      onChange={(e) => setChillerNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Masalah Mesin / Fasilitas (Bila ada)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Steam wand kiri agak berat, sudah dibersihkan"
                      value={equipmentIssueNotes}
                      onChange={(e) => setEquipmentIssueNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bahan Baku & Inventory Handover */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-emerald-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    5. Stok Menipis & Prep untuk Shift Depan
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bahan Menipis / Perlu Restock
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Fresh milk sisa 3 karton, cup 16oz sisa 1 renceng"
                      value={lowStockItems}
                      onChange={(e) => setLowStockItems(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thawing & Food Prep yang Sudah Siap
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Simple syrup sudah diisi ulang, pastry 10 pcs thawing di chiller"
                      value={thawingAndPrepNotes}
                      onChange={(e) => setThawingAndPrepNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Catatan Operasional Tambahan */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  6. Pesan Khusus & Isu Pelanggan untuk Shift Selanjutnya
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Ada reservasi 10 orang jam 16:00 di outdoor; komplain AC di area pojok sudah dilaporkan ke teknisi gedung."
                  value={operationalNotes}
                  onChange={(e) => setOperationalNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition active:scale-95"
                >
                  <Send className="size-4" />
                  Simpan & Kirim Serah Terima Shift
                </button>
              </div>
            </form>
          ) : (
            /* Tab: History Logbook */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Riwayat Buku Serah Terima ({historyList.length} Catatan)
                </p>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 print:hidden"
                >
                  <Printer className="size-3.5 text-slate-500" />
                  Cetak Lembar Logbook
                </button>
              </div>

              {historyList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                  Belum ada log serah terima shift tercatat. Silakan buat serah terima shift baru di tab pertama.
                </div>
              ) : (
                <div className="space-y-4">
                  {historyList.map((entry) => {
                    const cfg = SHIFT_CONFIG[entry.shift] || SHIFT_CONFIG.pagi;
                    const isPending = entry.status === "pending_acknowledgment";
                    const isAcknowledgingThis = acknowledgingId === entry.id;

                    return (
                      <div
                        key={entry.id}
                        className={`rounded-2xl border p-5 transition space-y-4 ${
                          isPending
                            ? "border-amber-300 bg-amber-50/30 shadow-sm"
                            : "border-slate-200/90 bg-white"
                        }`}
                      >
                        {/* Header card */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{cfg.icon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {cfg.label}
                                </span>
                                <span className="text-xs text-slate-500">
                                  • {entry.date} ({formatTime(entry.submittedAt)})
                                </span>
                              </div>
                              <p className="text-xs text-slate-600">
                                Diserahkan oleh: <strong className="text-slate-900">{entry.outgoingPIC}</strong>
                                {entry.outgoingRole ? ` (${entry.outgoingRole})` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                                <Clock3 className="size-3" />
                                Menunggu Konfirmasi Shift Depan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                                <CheckCircle2 className="size-3 text-emerald-700" />
                                Diterima & Terverifikasi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metrik ringkas: Kas, SOP, Peralatan */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500">Kas Laci</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {formatRupiah(entry.cashFloat.actualCash)}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Selisih: {formatRupiah(entry.cashFloat.discrepancy)}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500">SOP Hari Ini</p>
                            <p className="font-bold text-slate-900 mt-0.5">
                              {entry.completedTaskCount} Selesai
                            </p>
                            <p className="text-[10px] text-amber-700">
                              {entry.pendingTaskCount} Pending
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500">Suhu Chiller</p>
                            <p className="font-bold text-emerald-700 mt-0.5">
                              {entry.equipment.chillerTempOk ? "✓ Aman / OK" : "⚠ Ada Kendala"}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {entry.equipment.chillerNote || "Standar terpenuhi"}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] uppercase font-bold text-slate-500">Kebersihan Bar</p>
                            <p className="font-bold text-emerald-700 mt-0.5">
                              {entry.equipment.cleanlinessStandardMet ? "✓ Standar Terpenuhi" : "⚠ Perlu Perhatian"}
                            </p>
                            <p className="text-[10px] text-slate-500">Area bersih & rapi</p>
                          </div>
                        </div>

                        {/* Catatan Stok & Operasional */}
                        <div className="text-xs space-y-1.5 bg-slate-50/60 rounded-xl p-3 border border-slate-100">
                          {entry.inventory.lowStockItems ? (
                            <p className="text-slate-700">
                              <strong className="text-slate-900">📦 Stok Menipis:</strong>{" "}
                              {entry.inventory.lowStockItems}
                            </p>
                          ) : null}
                          {entry.inventory.thawingAndPrepNotes ? (
                            <p className="text-slate-700">
                              <strong className="text-slate-900">🥐 Thawing & Prep:</strong>{" "}
                              {entry.inventory.thawingAndPrepNotes}
                            </p>
                          ) : null}
                          {entry.operationalNotes ? (
                            <p className="text-slate-700">
                              <strong className="text-slate-900">💬 Catatan Khusus:</strong>{" "}
                              {entry.operationalNotes}
                            </p>
                          ) : null}
                        </div>

                        {/* Status Acknowledgment */}
                        {!isPending ? (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs text-emerald-900">
                            <UserCheck className="size-4 text-emerald-700 shrink-0" />
                            <div>
                              <p className="font-bold">
                                Diterima oleh: {entry.acknowledgedBy} ·{" "}
                                {formatTime(entry.acknowledgedAt)}
                              </p>
                              {entry.incomingNotes ? (
                                <p className="text-emerald-800 text-[11px] mt-0.5">
                                  Catatan kru masuk: &quot;{entry.incomingNotes}&quot;
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ) : isAcknowledgingThis ? (
                          <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-3.5 space-y-3 print:hidden">
                            <p className="text-xs font-bold text-emerald-950">
                              Konfirmasi Penerimaan Shift oleh Kru Masuk
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <input
                                type="text"
                                placeholder="Nama Anda (PIC Penerima) *"
                                value={incomingPIC}
                                onChange={(e) => setIncomingPIC(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
                              />
                              <input
                                type="text"
                                placeholder="Catatan singkat (Opsional, e.g. Kas cocok)"
                                value={incomingNote}
                                onChange={(e) => setIncomingNote(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setAcknowledgingId(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmAcknowledge(entry.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
                              >
                                ✓ Konfirmasi Diterima & Pahami
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 print:hidden">
                            <p className="text-xs text-amber-800">
                              Menunggu kru shift berikutnya menandatangani serah terima.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setAcknowledgingId(entry.id);
                                setIncomingPIC("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700 transition active:scale-95"
                            >
                              <UserCheck className="size-3.5" />
                              Konfirmasi & Terima Shift Ini
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="size-4 text-slate-500" />
            Cetak Log Handover
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
