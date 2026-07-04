import { OutletStatus, OutletTier } from "../types";

export function getOutletStatusClass(status: OutletStatus) {
  if (status === "Online") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Review") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export function getOutletTierClass(tier: OutletTier) {
  if (tier === "Flagship") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (tier === "Standard") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}
