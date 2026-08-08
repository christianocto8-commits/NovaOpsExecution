"use client";

import { useState } from "react";
import { Bluetooth, Loader2, Printer, RefreshCw, X } from "lucide-react";

import {
  connectToPrinter,
  getSavedPrinterAddress,
  isNativeLabelSupported,
  printLabel,
  type BluetoothDevice,
  type LabelPrintData,
} from "@/services/label-printer.service";
import { useToast } from "@/shared/toast";

type LabelPrintModalProps = {
  label: LabelPrintData;
  onClose: () => void;
};

export function LabelPrintModal({ label, onClose }: LabelPrintModalProps) {
  const toast = useToast();
  const nativeSupported = isNativeLabelSupported();
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(() =>
    getSavedPrinterAddress()
  );
  const [isPrinting, setIsPrinting] = useState(false);

  const scan = async () => {
    setIsScanning(true);
    setDevices([]);
    try {
      const { startPrinterScan } = await import("@/services/label-printer.service");
      await startPrinterScan(setDevices);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memulai scan.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (address: string) => {
    setConnectingAddress(address);
    try {
      const device = await connectToPrinter(address);
      if (device) {
        setConnectedAddress(device.address);
        setDevices([]);
        toast.success(`Terhubung ke ${device.name}.`);
      } else {
        toast.error("Tidak bisa terhubung ke printer.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal terhubung ke printer.");
    } finally {
      setConnectingAddress(null);
    }
  };

  const handlePrint = async () => {
    if (nativeSupported && !connectedAddress) {
      toast.error("Hubungkan printer bluetooth terlebih dahulu.");
      return;
    }
    setIsPrinting(true);
    try {
      await printLabel(label);
      toast.success("Label dikirim ke printer.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cetak label gagal.");
    } finally {
      setIsPrinting(false);
    }
  };

  const printableDate = (iso: string) =>
    new Date(iso).toLocaleString(["id-ID"], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cetak label"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Printer className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Cetak Label</h2>
              <p className="text-xs text-slate-500">{label.itemName} · {label.batchCode ?? "tanpa batch"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!nativeSupported ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Anda sedang di browser web. Cetak label lewat dialog printer sistem (format A4),
                atau gunakan app mobile untuk mencetak ke printer thermal bluetooth.
              </div>
              <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase text-slate-500">Pratinjau label</p>
                <div className="mt-2 rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed">
                  <div className="text-center font-bold">{label.outletName ?? "NOVAOPS OUTLET"}</div>
                  <div className="text-center text-sm font-bold">FOOD PREP</div>
                  <div className="text-center font-bold">
                    DISCARD BY
                    <br />
                    {printableDate(label.discardAt)}
                  </div>
                  <div className="text-center text-sm font-bold">{label.itemName.toUpperCase()}</div>
                  {label.quantityText ? <div>JUMLAH: {label.quantityText}</div> : null}
                  <div>KATEGORI: {label.category}</div>
                  <div>DIBUAT: {printableDate(label.preparedAt)}</div>
                  <div>DIBUANG: {printableDate(label.discardAt)}</div>
                  {label.shelfHours != null ? <div>SHELF LIFE: {label.shelfHours} JAM</div> : null}
                  {label.batchCode ? <div className="text-center">{label.batchCode}</div> : null}
                </div>
              </div>
            </div>
          ) : connectedAddress ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Bluetooth className="size-4" />
                  Printer terhubung
                </div>
                <p className="mt-1 text-xs text-emerald-600">{connectedAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => setConnectedAddress(null)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <RefreshCw className="size-3.5" />
                Ganti printer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Printer bluetooth</p>
                <button
                  type="button"
                  onClick={() => void scan()}
                  disabled={isScanning}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {isScanning ? <Loader2 className="size-4 animate-spin" /> : <Bluetooth className="size-4" />}
                  {isScanning ? "Scanning..." : "Scan printer"}
                </button>
              </div>

              {devices.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {devices.map((device) => (
                    <li key={device.address}>
                      <button
                        type="button"
                        onClick={() => void handleConnect(device.address)}
                        disabled={connectingAddress === device.address}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{device.name}</p>
                          <p className="text-xs text-slate-500">{device.address}</p>
                        </div>
                        {connectingAddress === device.address ? (
                          <Loader2 className="size-4 shrink-0 animate-spin text-emerald-700" />
                        ) : (
                          <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            Hubungkan
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                  {isScanning
                    ? "Mencari printer bluetooth di sekitar..."
                    : "Tekan Scan printer untuk mencari printer thermal bluetooth yang sudah dipasangkan."}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={isPrinting || (nativeSupported && !connectedAddress)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPrinting ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            {isPrinting ? "Mencetak..." : "Cetak label"}
          </button>
        </div>
      </div>
    </div>
  );
}