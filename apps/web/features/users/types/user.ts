export type UserStatus = "Active" | "Pending" | "Suspended";

export type UserRole = "Owner/Admin" | "Area Manager" | "Outlet";

export type OutletScope = "All Outlets" | "Multiple Outlets" | "Single Outlet";

export type User = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  outlet: string;
  outletIds: string[];
  outletScope: OutletScope;
  status: UserStatus;
  lastActive: string;
};

export type UserFormState = {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  outlet: string;
  outletIds: string[];
  outletScope: OutletScope;
  status: UserStatus;
};
