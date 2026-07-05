import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export type SidebarGroup = "Main" | "Operations" | "Analytics" | "Administration";

export type SidebarItem = {
  label: string;
  href: string;
  group: SidebarGroup;
  icon: typeof LayoutDashboard;
};

export const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    group: "Main",
    icon: LayoutDashboard,
  },
  {
    label: "Outlets",
    href: "/dashboard/outlets",
    group: "Operations",
    icon: Building2,
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    group: "Operations",
    icon: ClipboardCheck,
  },
  {
    label: "Draft Center",
    href: "/dashboard/drafts",
    group: "Operations",
    icon: FileText,
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    group: "Analytics",
    icon: BarChart3,
  },
  {
    label: "Users",
    href: "/dashboard/users",
    group: "Administration",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    group: "Administration",
    icon: Settings,
  },
];

export const sidebarGroups: SidebarGroup[] = ["Main", "Operations", "Analytics", "Administration"];
