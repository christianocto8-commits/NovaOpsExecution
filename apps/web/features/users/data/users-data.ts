import { User, UserFormState } from "../types";

export const emptyUserForm: UserFormState = {
  name: "",
  email: "",
  role: "Outlet",
  outlet: "KOV Montre",
  outletScope: "Single Outlet",
  status: "Pending",
};

export const mockUsers: User[] = [
  {
    id: "ACC-001",
    name: "Owner Admin",
    email: "admin@novaops.com",
    role: "Owner/Admin",
    outlet: "All Outlets",
    outletScope: "All Outlets",
    status: "Active",
    lastActive: "Today",
  },
  {
    id: "ACC-002",
    name: "Area Manager South",
    email: "area.south@novaops.com",
    role: "Area Manager",
    outlet: "KOV Montre, KOV Heritage, KOV Sultan Agung",
    outletScope: "Multiple Outlets",
    status: "Active",
    lastActive: "2 hours ago",
  },
  {
    id: "ACC-003",
    name: "KOV Heritage",
    email: "heritage@kov.co.id",
    role: "Outlet",
    outlet: "KOV Heritage",
    outletScope: "Single Outlet",
    status: "Active",
    lastActive: "Today",
  },
  {
    id: "ACC-004",
    name: "KOV Montre",
    email: "montre@kov.co.id",
    role: "Outlet",
    outlet: "KOV Montre",
    outletScope: "Single Outlet",
    status: "Pending",
    lastActive: "Invite pending",
  },
];
