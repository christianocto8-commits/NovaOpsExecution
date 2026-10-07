export type ShiftPeriod = "pagi" | "sore" | "malam";

export type ShiftHandoverStatus = "pending_acknowledgment" | "acknowledged";

export type CashFloatRecord = {
  openingAmount: number; // Kas modal awal di laci
  actualCash: number; // Kas fisik terhitung saat serah terima
  systemExpected?: number; // Target sistem (opsional)
  discrepancy: number; // actualCash - (openingAmount + sales)
  notes?: string;
};

export type EquipmentCheckRecord = {
  chillerTempOk: boolean;
  chillerNote?: string;
  espressoMachineOk: boolean;
  fryerOrOvenOk: boolean;
  posPrinterOk: boolean;
  cleanlinessStandardMet: boolean;
  issueNotes?: string;
};

export type InventoryHandoverRecord = {
  lowStockItems: string; // e.g. "Susu UHT sisa 2 carton, Sirup Vanilla habis"
  thawingAndPrepNotes: string; // e.g. "Patties 5 pack di chiller prep, croffle proofing jam 15:00"
};

export type ShiftHandoverEntry = {
  id: string;
  outletId: string | number;
  outletName: string;
  shift: ShiftPeriod;
  date: string; // YYYY-MM-DD
  outgoingPIC: string;
  outgoingRole?: string;
  submittedAt: string; // ISO String
  
  cashFloat: CashFloatRecord;
  equipment: EquipmentCheckRecord;
  inventory: InventoryHandoverRecord;
  operationalNotes: string;

  // Task & SOP Snapshot
  completedTaskCount: number;
  pendingTaskCount: number;
  overdueTaskCount: number;
  pendingTaskTitles?: string[];

  // Incoming crew acknowledgment
  status: ShiftHandoverStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  incomingNotes?: string;
};
