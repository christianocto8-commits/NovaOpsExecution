import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  History,
  Home,
  LayoutDashboard,
  Settings,
  Store,
  Users,
} from "lucide-react";

import { NovaRole } from "./role-config";

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  allowedRoles: NovaRole[];
  section: "enterprise" | "operations" | "administration" | "configuration";
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["OWNER_ADMIN", "AREA_MANAGER"],
    section: "enterprise",
  },
  {
    id: "outlet-home",
    label: "Home",
    href: "/dashboard",
    icon: Home,
    allowedRoles: ["OUTLET"],
    section: "operations",
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: ClipboardCheck,
    allowedRoles: ["OWNER_ADMIN", "AREA_MANAGER", "OUTLET"],
    section: "operations",
  },
  {
    id: "drafts",
    label: "Draft Center",
    href: "/dashboard/drafts",
    icon: FileText,
    allowedRoles: ["OWNER_ADMIN", "AREA_MANAGER", "OUTLET"],
    section: "operations",
  },
  {
    id: "history",
    label: "History",
    href: "/dashboard/history",
    icon: History,
    allowedRoles: ["OUTLET"],
    section: "operations",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    allowedRoles: ["OWNER_ADMIN", "AREA_MANAGER"],
    section: "operations",
  },
  {
    id: "accounts",
    label: "Accounts",
    href: "/dashboard/users",
    icon: Users,
    allowedRoles: ["OWNER_ADMIN"],
    section: "administration",
  },
  {
    id: "outlets",
    label: "Outlets",
    href: "/dashboard/outlets",
    icon: Building2,
    allowedRoles: ["OWNER_ADMIN"],
    section: "administration",
  },
  {
    id: "outlet-profile",
    label: "Outlet Profile",
    href: "/dashboard/outlet-profile",
    icon: Store,
    allowedRoles: ["OUTLET"],
    section: "administration",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    allowedRoles: ["OWNER_ADMIN"],
    section: "configuration",
  },
];

export const navigationSectionLabels: Record<NavigationItem["section"], string> = {
  enterprise: "Enterprise",
  operations: "Operations",
  administration: "Administration",
  configuration: "Configuration",
};
