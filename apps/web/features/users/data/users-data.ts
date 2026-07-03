export type UserStatus = "Active" | "Pending" | "Suspended";
export type UserRole = "Owner" | "Admin" | "Area Manager" | "Supervisor" | "Crew";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  outlet: string;
  status: UserStatus;
  lastActive: string;
};

export const users: UserRow[] = [
  {
    id: "USR-001",
    name: "Admin NovaOps",
    email: "admin@novaops.com",
    role: "Owner",
    outlet: "All Outlets",
    status: "Active",
    lastActive: "Today",
  },
  {
    id: "USR-002",
    name: "Maya Operations",
    email: "maya@novaops.com",
    role: "Area Manager",
    outlet: "KOV Montre",
    status: "Active",
    lastActive: "2 hours ago",
  },
  {
    id: "USR-003",
    name: "Raka Supervisor",
    email: "raka@novaops.com",
    role: "Supervisor",
    outlet: "KOV Heritage",
    status: "Pending",
    lastActive: "Yesterday",
  },
  {
    id: "USR-004",
    name: "Dina Crew",
    email: "dina@novaops.com",
    role: "Crew",
    outlet: "KOV Sultan Agung",
    status: "Active",
    lastActive: "3 days ago",
  },
];