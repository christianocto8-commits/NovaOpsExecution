import { UserRole, UserStatus } from "../types";

export function getUserStatusClass(status: UserStatus) {
  if (status === "Active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

export function getUserRoleClass(role: UserRole) {
  if (role === "Owner/Admin") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (role === "Area Manager") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (role === "Finance") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}
