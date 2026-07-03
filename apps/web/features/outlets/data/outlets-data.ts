export type OutletStatus = "Online" | "Review" | "Offline";
export type OutletTier = "Flagship" | "Standard" | "Express";

export type OutletRow = {
  id: string;
  name: string;
  area: string;
  manager: string;
  status: OutletStatus;
  tier: OutletTier;
  compliance: string;
  openTasks: number;
  lastAudit: string;
};

export const outlets: OutletRow[] = [
  {
    id: "OUT-001",
    name: "KOV Montre",
    area: "Semarang",
    manager: "Maya Operations",
    status: "Online",
    tier: "Flagship",
    compliance: "94%",
    openTasks: 6,
    lastAudit: "Today",
  },
  {
    id: "OUT-002",
    name: "KOV Heritage",
    area: "Semarang",
    manager: "Raka Supervisor",
    status: "Online",
    tier: "Standard",
    compliance: "88%",
    openTasks: 9,
    lastAudit: "Yesterday",
  },
  {
    id: "OUT-003",
    name: "KOV Sultan Agung",
    area: "Semarang",
    manager: "Dina Lead",
    status: "Review",
    tier: "Standard",
    compliance: "81%",
    openTasks: 7,
    lastAudit: "2 days ago",
  },
  {
    id: "OUT-004",
    name: "KOV Sula",
    area: "Semarang",
    manager: "Admin NovaOps",
    status: "Online",
    tier: "Express",
    compliance: "91%",
    openTasks: 2,
    lastAudit: "Today",
  },
];