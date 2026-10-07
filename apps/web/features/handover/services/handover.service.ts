import type { ShiftHandoverEntry, ShiftPeriod } from "../types";

const STORAGE_KEY = "novaops_shift_handovers_v2";
const EVENT_NAME = "novaops_handover_update";

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function getInitialSeedData(): ShiftHandoverEntry[] {
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  return [
    {
      id: "sh-seed-today-morning",
      outletId: 1,
      outletName: "Grand Indonesia Bar",
      shift: "pagi",
      date: today,
      outgoingPIC: "Dimas Anggara",
      outgoingRole: "Senior Barista",
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      cashFloat: {
        openingAmount: 500000,
        actualCash: 1750000,
        systemExpected: 1750000,
        discrepancy: 0,
        notes: "Kas modal awal utuh, uang fisik sesuai rekap POS.",
      },
      equipment: {
        chillerTempOk: true,
        chillerNote: "Chiller 1: +3°C, Chiller 2: +2°C",
        espressoMachineOk: true,
        fryerOrOvenOk: true,
        posPrinterOk: true,
        cleanlinessStandardMet: true,
        issueNotes: "Grinder espresso kalibrasi ulang jam 10:30, rasa stabil.",
      },
      inventory: {
        lowStockItems: "Fresh milk sisa 3 karton, Sirup Caramel sisa 1 botol.",
        thawingAndPrepNotes: "Pastry croissant 12 pcs sedang thawing di chiller.",
      },
      operationalNotes: "Trafik jam makan siang ramai lancar. Semua table indoor bersih.",
      completedTaskCount: 8,
      pendingTaskCount: 2,
      overdueTaskCount: 0,
      pendingTaskTitles: ["Restock cup & lid takeaway", "Sanitasi area bar siang"],
      status: "pending_acknowledgment",
    },
    {
      id: "sh-seed-yesterday-sore",
      outletId: 1,
      outletName: "Grand Indonesia Bar",
      shift: "sore",
      date: yesterday,
      outgoingPIC: "Siti Rahma",
      outgoingRole: "Shift Supervisor",
      submittedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      cashFloat: {
        openingAmount: 500000,
        actualCash: 3420000,
        systemExpected: 3420000,
        discrepancy: 0,
        notes: "Setoran tunai shift sore tersimpan di drop safe.",
      },
      equipment: {
        chillerTempOk: true,
        espressoMachineOk: true,
        fryerOrOvenOk: true,
        posPrinterOk: true,
        cleanlinessStandardMet: true,
      },
      inventory: {
        lowStockItems: "Biji kopi house blend aman (3 pouch).",
        thawingAndPrepNotes: "Pre-closing wash selesai jam 21:45.",
      },
      operationalNotes: "Penjualan target tercapai 105%. Area bar rapi.",
      completedTaskCount: 14,
      pendingTaskCount: 0,
      overdueTaskCount: 0,
      status: "acknowledged",
      acknowledgedBy: "Budi Santoso",
      acknowledgedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      incomingNotes: "Kondisi bar rapi, kas dihitung sesuai. Siap closing.",
    },
  ];
}

class ShiftHandoverService {
  private readAll(): ShiftHandoverEntry[] {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = getInitialSeedData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(raw) as ShiftHandoverEntry[];
    } catch {
      return getInitialSeedData();
    }
  }

  private writeAll(items: ShiftHandoverEntry[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch (err) {
      console.error("Failed to write shift handovers", err);
    }
  }

  public listHandovers(outletId?: string | number): ShiftHandoverEntry[] {
    const all = this.readAll();
    if (outletId !== undefined && outletId !== null && outletId !== "") {
      const idStr = String(outletId).toLowerCase();
      return all.filter((item) => String(item.outletId).toLowerCase() === idStr || idStr === "all");
    }
    return all;
  }

  public getLatestPending(outletId?: string | number): ShiftHandoverEntry | null {
    const list = this.listHandovers(outletId);
    const pending = list.filter((h) => h.status === "pending_acknowledgment");
    if (pending.length === 0) return null;
    return pending.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )[0];
  }

  public submitHandover(entry: Omit<ShiftHandoverEntry, "id" | "submittedAt" | "status">): ShiftHandoverEntry {
    const all = this.readAll();
    const newEntry: ShiftHandoverEntry = {
      ...entry,
      id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      submittedAt: new Date().toISOString(),
      status: "pending_acknowledgment",
    };

    // Prepend to list
    const updated = [newEntry, ...all];
    this.writeAll(updated);
    return newEntry;
  }

  public acknowledgeHandover(
    id: string,
    incomingPIC: string,
    incomingNotes?: string
  ): ShiftHandoverEntry | null {
    const all = this.readAll();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updatedItem: ShiftHandoverEntry = {
      ...all[index],
      status: "acknowledged",
      acknowledgedBy: incomingPIC,
      acknowledgedAt: new Date().toISOString(),
      incomingNotes: incomingNotes || undefined,
    };

    all[index] = updatedItem;
    this.writeAll(all);
    return updatedItem;
  }

  public deleteHandover(id: string): void {
    const all = this.readAll();
    const filtered = all.filter((item) => item.id !== id);
    this.writeAll(filtered);
  }

  public subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    const handler = () => callback();
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }
}

export const shiftHandoverService = new ShiftHandoverService();
