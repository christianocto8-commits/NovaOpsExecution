import { UserFormState } from "../types";

export const emptyUserForm: UserFormState = {
  name: "",
  email: "",
  username: "",
  password: "",
  role: "Outlet",
  outlet: "",
  outletIds: [],
  outletScope: "Single Outlet",
  status: "Active",
};
