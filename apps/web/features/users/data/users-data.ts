import { UserFormState } from "../types";

export const emptyUserForm: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "Outlet",
  outlet: "",
  outletIds: [],
  outletScope: "Single Outlet",
  status: "Pending",
};
