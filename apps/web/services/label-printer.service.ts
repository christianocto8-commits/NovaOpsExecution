import { Capacitor } from "@capacitor/core";
import { CapacitorThermalPrinter, type BluetoothDevice } from "capacitor-thermal-printer";

export type LabelPrintData = {
  itemName: string;
  category?: string;
  batchCode?: string | null;
  quantityText?: string | null;
  unit?: string | null;
  preparedAt: string;
  discardAt: string;
  shelfHours?: number | null;
  outletName?: string | null;
};

export type { BluetoothDevice };

export function isNativeLabelSupported() {
  return Capacitor.isNativePlatform();
}

export function getSavedPrinterAddress(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("novaops_label_printer");
}

export function setSavedPrinterAddress(address: string | null) {
  if (typeof window === "undefined") return;
  if (!address) {
    window.localStorage.removeItem("novaops_label_printer");
    return;
  }
  window.localStorage.setItem("novaops_label_printer", address);
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(["id-ID"], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function standardizeCategory(category?: string) {
  if (!category) return "FOOD PREP";
  const map: Record<string, string> = {
    raw: "RAW / DAGING",
    prepared: "PREPARED",
    dairy: "DAIRY",
    bakery: "BAKERY",
    beverage: "BEVERAGE",
    cold_chain: "COLD CHAIN",
    other: "LAINNYA",
  };
  return map[category] ?? category.toUpperCase();
}

function buildLabelContent(data: LabelPrintData) {
  const printer = CapacitorThermalPrinter.begin();

  printer
    .align("center")
    .font("B")
    .text(`${data.outletName ?? "NOVAOPS OUTLET"}\n`)
    .bold()
    .doubleHeight()
    .doubleWidth()
    .text("FOOD PREP\n");

  printer.bold(false).doubleHeight(false).doubleWidth(false).font("B");

  printer.align("center").lineSpacing(1).inverse().text("DISCARD BY\n");

  printer
    .align("center")
    .bold()
    .inverse()
    .doubleHeight()
    .text(formatTimestamp(data.discardAt) + "\n")
    .doubleHeight(false)
    .inverse(false)
    .bold(false);

  printer.align("center").lineSpacing(2).text("\n" + data.itemName.toUpperCase() + "\n");

  printer.align("left").font("B").lineSpacing(2);

  const quantityLine = data.quantityText
    ? `${data.quantityText}${data.unit ? ` ${data.unit}` : ""}`
    : null;

  if (quantityLine) {
    printer.text(`JUMLAH: ${quantityLine}\n`);
  }
  printer.text(`KATEGORI: ${standardizeCategory(data.category)}\n`);
  printer.text(`DIBUAT: ${formatTimestamp(data.preparedAt)}\n`);
  printer.text(`DIBUANG: ${formatTimestamp(data.discardAt)}\n`);
  if (data.shelfHours != null) {
    printer.text(`SHELF LIFE: ${data.shelfHours} JAM\n`);
  }

  if (data.batchCode) {
    printer.align("center").lineSpacing(4).text("\n" + data.batchCode + "\n");
    printer.barcode("CODE128", data.batchCode);
  }

  printer.align("center").text("\nNOVA OPS EXECUTION\n");
  printer.feedCutPaper(true);

  return printer;
}

export async function connectToPrinter(address: string): Promise<BluetoothDevice | null> {
  if (!isNativeLabelSupported()) return null;
  const device = await CapacitorThermalPrinter.connect({ address });
  if (device) {
    setSavedPrinterAddress(address);
  }
  return device;
}

export async function startPrinterScan(onDevices: (devices: BluetoothDevice[]) => void) {
  void CapacitorThermalPrinter.addListener("discoverDevices", (data) => {
    onDevices(data.devices);
  });
  return CapacitorThermalPrinter.startScan();
}

export function stopPrinterScan() {
  return CapacitorThermalPrinter.stopScan();
}

export function printLabelViaWeb(data: LabelPrintData) {
  const content = buildWebLabelHtml(data);
  const width = 400;
  const height = 600;
  const printWindow = window.open("", "_blank", `width=${width},height=${height}`);
  if (!printWindow) return;

  printWindow.document.write(
    `<!doctype html><html><head><title>Cetak Label</title><style>
      body { font-family: monospace; margin: 0; padding: 12px; width: 300px; }
      .label { border: 2px solid #000; padding: 8px; }
      .center { text-align: center; }
      .big { font-size: 20px; font-weight: bold; }
      .row { font-size: 13px; margin: 4px 0; }
      @media print { body { width: 300px; } }
    </style></head><body>${content}<script>window.onload = function () { window.print(); }</script></body></html>`
  );
  printWindow.document.close();
}

function buildWebLabelHtml(data: LabelPrintData) {
  const quantityLine = data.quantityText
    ? `${data.quantityText}${data.unit ? ` ${data.unit}` : ""}`
    : null;

  return `
    <div class="label">
      <div class="center">${data.outletName ?? "NOVAOPS OUTLET"}</div>
      <div class="center big">FOOD PREP</div>
      <div class="center big">DISCARD BY: ${formatTimestamp(data.discardAt)}</div>
      <div class="center big">${data.itemName.toUpperCase()}</div>
      ${quantityLine ? `<div class="row">JUMLAH: ${quantityLine}</div>` : ""}
      <div class="row">KATEGORI: ${standardizeCategory(data.category)}</div>
      <div class="row">DIBUAT: ${formatTimestamp(data.preparedAt)}</div>
      <div class="row">DIBUANG: ${formatTimestamp(data.discardAt)}</div>
      ${data.shelfHours != null ? `<div class="row">SHELF LIFE: ${data.shelfHours} JAM</div>` : ""}
      ${data.batchCode ? `<div class="center">${data.batchCode}</div>` : ""}
      <div class="center">NOVA OPS EXECUTION</div>
    </div>`;
}

export async function printLabel(data: LabelPrintData): Promise<void> {
  if (isNativeLabelSupported()) {
    const content = buildLabelContent(data);
    await content.write();
    return;
  }
  printLabelViaWeb(data);
}