import { OperatorFormState, OutletFormState } from "../types";

export const emptyOutletForm: OutletFormState = {
  code: "",
  name: "",
  area: "",
  phone: "",
  status: "Online",
  tier: "Standard",
};

export const emptyOperatorForm: OperatorFormState = {
  outletId: "",
  name: "",
  position: "Crew",
  pin: "",
  active: true,
};
