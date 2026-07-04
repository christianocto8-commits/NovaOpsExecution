import {
  OperatorFormState,
  Outlet,
  OutletFormState,
  OutletOperator,
} from "../types";

export const emptyOutletForm: OutletFormState = {
  name: "",
  area: "Semarang",
  status: "Online",
  tier: "Standard",
  accountEmail: "",
};

export const emptyOperatorForm: OperatorFormState = {
  outletId: "",
  name: "",
  position: "Crew",
  pin: "",
  active: true,
};

export const mockOutlets: Outlet[] = [
  {
    id: "OUT-001",
    name: "KOV Montre",
    area: "Semarang",
    status: "Online",
    tier: "Flagship",
    compliance: "94%",
    openTasks: 6,
    lastAudit: "Today",
    accountEmail: "montre@kov.co.id",
  },
  {
    id: "OUT-002",
    name: "KOV Heritage",
    area: "Semarang",
    status: "Online",
    tier: "Standard",
    compliance: "88%",
    openTasks: 9,
    lastAudit: "Yesterday",
    accountEmail: "heritage@kov.co.id",
  },
  {
    id: "OUT-003",
    name: "KOV Sultan Agung",
    area: "Semarang",
    status: "Review",
    tier: "Standard",
    compliance: "81%",
    openTasks: 7,
    lastAudit: "2 days ago",
    accountEmail: "sultanagung@kov.co.id",
  },
  {
    id: "OUT-004",
    name: "KOV Sula",
    area: "Semarang",
    status: "Online",
    tier: "Express",
    compliance: "91%",
    openTasks: 2,
    lastAudit: "Today",
    accountEmail: "sula@kov.co.id",
  },
];

export const mockOutletOperators: OutletOperator[] = [
  {
    id: "OPR-001",
    outletId: "OUT-001",
    name: "Alvin",
    position: "Head Barista",
    pin: "1234",
    active: true,
  },
  {
    id: "OPR-002",
    outletId: "OUT-001",
    name: "Dina",
    position: "Lead Barista",
    pin: "2345",
    active: true,
  },
  {
    id: "OPR-003",
    outletId: "OUT-002",
    name: "Raka",
    position: "Head Barista",
    pin: "3456",
    active: true,
  },
  {
    id: "OPR-004",
    outletId: "OUT-002",
    name: "Maya",
    position: "Crew",
    pin: "4567",
    active: true,
  },
  {
    id: "OPR-005",
    outletId: "OUT-003",
    name: "Fajar",
    position: "Lead Barista",
    pin: "5678",
    active: false,
  },
];
