export type SidebarItem = {
  label: string;
  href: string;
  group: "Main" | "Operations" | "Analytics" | "Administration";
};

export const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    group: "Main",
  },
  {
    label: "Outlets",
    href: "/dashboard/outlets",
    group: "Operations",
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    group: "Operations",
  },
  {
    label: "Draft Center",
    href: "/dashboard/drafts",
    group: "Operations",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    group: "Analytics",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    group: "Administration",
  },
];

export const sidebarGroups = ["Main", "Operations", "Analytics", "Administration"] as const;