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

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiredPermissions: string[];
  section: "enterprise" | "operations" | "administration" | "configuration";
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requiredPermissions: ["report.read"],
    section: "enterprise",
  },
  {
    id: "outlet-home",
    label: "Home",
    href: "/dashboard",
    icon: Home,
    requiredPermissions: ["task.read"],
    section: "operations",
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: ClipboardCheck,
    requiredPermissions: ["task.read"],
    section: "operations",
  },
  {
    id: "drafts",
    label: "Draft Center",
    href: "/dashboard/drafts",
    icon: FileText,
    requiredPermissions: ["task.execute"],
    section: "operations",
  },
  {
    id: "history",
    label: "History",
    href: "/dashboard/history",
    icon: History,
    requiredPermissions: ["task.execute"],
    section: "operations",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    requiredPermissions: ["report.read"],
    section: "operations",
  },
  {
    id: "accounts",
    label: "Accounts",
    href: "/dashboard/users",
    icon: Users,
    requiredPermissions: ["user.read"],
    section: "administration",
  },
  {
    id: "outlets",
    label: "Outlets",
    href: "/dashboard/outlets",
    icon: Building2,
    requiredPermissions: ["outlet.read"],
    section: "administration",
  },
  {
    id: "outlet-profile",
    label: "Outlet Profile",
    href: "/dashboard/outlet-profile",
    icon: Store,
    requiredPermissions: ["outlet.read"],
    section: "administration",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    requiredPermissions: ["user.edit"],
    section: "configuration",
  },
];

export const navigationSectionLabels: Record<NavigationItem["section"], string> = {
  enterprise: "Enterprise",
  operations: "Operations",
  administration: "Administration",
  configuration: "Configuration",
};
