"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Coins,
  ShieldAlert,
  UserCheck,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import type { ShiftHandoverEntry } from "../types";
import { shiftHandoverService } from "../services/handover.service";

type ShiftHandoverBannerProps = {
  outletId?: string | number;
  onOpenModal: () => void;
};

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function ShiftHandoverBanner({ outletId, onOpenModal }: ShiftHandoverBannerProps) {
  const [pendingHandover, setPendingHandover] = useState<ShiftHandoverEntry | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [incomingPIC, setIncomingPIC] = useState("");
  const [incomingNote, setIncomingNote] = useState("");
  const [justAcknowledged, setJustAcknowledged] = useState<ShiftHandoverEntry | null>(null);

  const checkPending = () => {
    const latest = shiftHandoverService.getLatestPending(outletId);
    setPendingHandover(latest);
  };

  useEffect(() => {
    checkPending();
    const unsubscribe = shiftHandoverService.subscribe(checkPending);
    return unsubscribe;
  }, [outletId]);

  const handleAcknowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingHandover || !incomingPIC.trim()) return;

    const updated = shiftHandoverService.acknowledgeHandover(
      pendingHandover.id,
      incomingPIC.trim(),
      incomingNote.trim()
    );

    if (updated) {
      setJustAcknowledged(updated);
      setIsConfirming(false);
      setIncomingPIC("");
      setIncomingNote("");
      checkPending();

      setTimeout(() => {
        setJustAcknowledged(null);
      }, 6000);
    }
  };

  if (justAcknowledged) {
    return (
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300 bg-gradient-to-r from-emerald-900 to-slate-900 p-4 sm:p-5 text-white shadow-md animate-fadeIn">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Shift Berhasil Diverifikasi & Diterima
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                Serah terima dari {justAcknowledged.outgoingPIC} telah dikonfirmasi oleh{" "}
                <span className="text-emerald-300 underline font-bold">
                  {justAcknowledged.acknowledgedBy}
                </span>
                . Selamat bertugas!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setJustAcknowledged(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!pendingHandover) {
    return null;
  }

  const shiftLabel =
    pendingHandover.shift === "pagi"
      ? "Opening (07:00 - 16:00)"
      : pendingHandover.shift === "sore"
        ? "Evening (15:00 - 00:00)"
        : "Midnight (23:00 - 08:00)";

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-100/40 to-white p-4 sm:p-5 text-slate-900 shadow-md transition">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Summary info */}
        <div className="flex items-start gap-3.5">
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
            <Bell className="size-5 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                Perlu Konfirmasi Shift
              </span>
              <span className="text-xs font-bold text-slate-800">
                {shiftLabel} • PIC: {pendingHandover.outgoingPIC}
              </span>
            </div>

            <p className="mt-1 text-sm font-bold text-slate-950">
              Buku Serah Terima Shift Masuk Menunggu Tanda Tangan Kru Berikutnya
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 font-semibold border border-amber-200">
                <Coins className="size-3.5 text-amber-600" />
                Kas Laci: {formatRupiah(pendingHandover.cashFloat.actualCash)} (Selisih:{" "}
                {formatRupiah(pendingHandover.cashFloat.discrepancy)})
              </span>
              <span className="rounded-lg bg-white/90 px-2.5 py-1 font-semibold border border-amber-200">
                ✓ {pendingHandover.completedTaskCount} SOP Selesai
                {pendingHandover.pendingTaskCount > 0
                  ? ` · ${pendingHandover.pendingTaskCount} Pending`
                  : ""}
              </span>
              {pendingHandover.inventory.lowStockItems ? (
                <span className="rounded-lg bg-white/90 px-2.5 py-1 font-medium border border-amber-200 truncate max-w-xs">
                  Stok: {pendingHandover.inventory.lowStockItems}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
          <button
            type="button"
            onClick={onOpenModal}
            className="rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-950 shadow-sm transition hover:bg-amber-50"
          >
            Lihat Detail Logbook ↗
          </button>
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 active:scale-95"
          >
            <UserCheck className="size-4" />
            Konfirmasi & Terima Shift
          </button>
        </div>
      </div>

      {/* Inline Quick Acknowledgment Modal/Card */}
      {isConfirming ? (
        <form
          onSubmit={handleAcknowledge}
          className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 space-y-3 transition animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-950 flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-700" />
              Tanda Tangan Penerimaan Shift ({shiftLabel})
            </p>
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Kru Penerima (PIC Shift Selanjutnya) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dewi Lestari (Barista Sore)"
                value={incomingPIC}
                onChange={(e) => setIncomingPIC(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Catatan Penerimaan (Kondisi Bar / Kas Fisik)
              </label>
              <input
                type="text"
                placeholder="e.g. Kas dihitung cocok, bar siap melayani pelanggan."
                value={incomingNote}
                onChange={(e) => setIncomingNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-700 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 transition active:scale-95"
            >
              ✓ Konfirmasi Diterima & Pahami
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
