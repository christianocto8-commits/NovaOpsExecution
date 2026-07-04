export type OutletStatus = "Online" | "Review" | "Offline";
export type OutletTier = "Flagship" | "Standard" | "Express";

export type OperatorPosition = "Head Barista" | "Lead Barista" | "Crew";

export type Outlet = {
  id: string;
  name: string;
  area: string;
  status: OutletStatus;
  tier: OutletTier;
  compliance: string;
  openTasks: number;
  lastAudit: string;
  accountEmail: string;
};

export type OutletOperator = {
  id: string;
  outletId: string;
  name: string;
  position: OperatorPosition;
  pin: string;
  active: boolean;
};

export type OutletFormState = {
  name: string;
  area: string;
  status: OutletStatus;
  tier: OutletTier;
  accountEmail: string;
};

export type OperatorFormState = {
  outletId: string;
  name: string;
  position: OperatorPosition;
  pin: string;
  active: boolean;
};
