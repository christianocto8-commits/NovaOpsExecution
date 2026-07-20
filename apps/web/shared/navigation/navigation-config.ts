import {
  BarChart3,
  Bell,
  Building2,
  ClipboardCheck,
  CalendarClock,
  FileText,
  Gauge,
  GitBranch,
  History,
  LayoutDashboard,
  Settings,
  Store,
  Users,
  Wrench,
} from "lucide-react";

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiredPermissions: string[];
  section: "enterprise" | "sop" | "operations" | "analytics" | "administration" | "configuration";
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requiredPermissions: ["report.read"],
    section: "sop",
  },
  {
    id: "compliance",
    label: "Compliance Center",
    href: "/dashboard/compliance",
    icon: Gauge,
    requiredPermissions: ["report.read"],
    section: "sop",
  },
  {
    id: "tasks",
    label: "Task",
    href: "/dashboard/tasks",
    icon: ClipboardCheck,
    requiredPermissions: ["task.read"],
    section: "sop",
  },
  {
    id: "schedules",
    label: "Schedules",
    href: "/dashboard/schedules",
    icon: CalendarClock,
    requiredPermissions: ["task.read"],
    section: "sop",
  },
  {
    id: "forms",
    label: "My Form",
    href: "/dashboard/forms",
    icon: FileText,
    requiredPermissions: ["task.read"],
    section: "sop",
  },
  {
    id: "corrective-actions",
    label: "Corrective Actions",
    href: "/dashboard/corrective-actions",
    icon: Wrench,
    requiredPermissions: ["task.read"],
    section: "sop",
  },
  {
    id: "drafts",
    label: "Draft Center",
    href: "/dashboard/drafts",
    icon: FileText,
    requiredPermissions: ["task.execute"],
    section: "sop",
  },
  {
    id: "outlets",
    label: "Outlets",
    href: "/dashboard/outlets",
    icon: Building2,
    requiredPermissions: ["outlet.read"],
    section: "operations",
  },
  {
    id: "outlet-profile",
    label: "Outlet Profile",
    href: "/dashboard/outlet-profile",
    icon: Store,
    requiredPermissions: ["outlet.read"],
    section: "operations",
  },
  {
    id: "notifications",
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
    requiredPermissions: ["notification.read"],
    section: "operations",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    requiredPermissions: ["report.read"],
    section: "analytics",
  },
  {
    id: "audit",
    label: "Audit Trail",
    href: "/dashboard/audit",
    icon: History,
    requiredPermissions: ["user.edit"],
    section: "analytics",
  },
  {
    id: "history",
    label: "History",
    href: "/dashboard/history",
    icon: History,
    requiredPermissions: ["task.execute"],
    section: "analytics",
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
    id: "workflows",
    label: "Workflows",
    href: "/dashboard/workflows",
    icon: GitBranch,
    requiredPermissions: ["user.edit"],
    section: "administration",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    href: "/dashboard/webhooks",
    icon: Bell,
    requiredPermissions: ["user.edit"],
    section: "configuration",
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
  sop: "Execution",
  operations: "Operations",
  analytics: "Analytics",
  administration: "Administration",
  configuration: "Configuration",
};
