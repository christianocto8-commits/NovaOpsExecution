import { User, UserFormState } from "../types";

export const emptyUserForm: UserFormState = {
  name: "",
  email: "",
  password: "User12345!",
  role: "Outlet",
  outlet: "",
  outletIds: [],
  outletScope: "Single Outlet",
  status: "Pending",
};

export const mockUsers: User[] = [
  {
    id: "ACC-001",
    name: "NovaOps Admin",
    email: "admin@novaops.local",
    role: "Owner/Admin",
    outlet: "All Outlets",
    outletIds: [],
    outletScope: "All Outlets",
    status: "Active",
    lastActive: "Today",
  },
  {
    id: "ACC-002",
    name: "Area Manager",
    email: "area@novaops.local",
    role: "Area Manager",
    outlet: "Multiple Outlets",
    outletIds: [],
    outletScope: "Multiple Outlets",
    status: "Active",
    lastActive: "2 hours ago",
  },
  {
    id: "ACC-003",
    name: "KOV Heritage Outlet",
    email: "heritage@novaops.local",
    role: "Outlet",
    outlet: "KOV Heritage",
    outletIds: [],
    outletScope: "Single Outlet",
    status: "Active",
    lastActive: "Today",
  },
  {
    id: "ACC-004",
    name: "KOV Sula Outlet",
    email: "sula@novaops.local",
    role: "Outlet",
    outlet: "KOV Sula",
    outletIds: [],
    outletScope: "Single Outlet",
    status: "Pending",
    lastActive: "Invite pending",
  },
];
