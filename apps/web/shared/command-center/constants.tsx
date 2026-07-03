import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  Plus,
  Settings,
} from "lucide-react";

import { CommandItem } from "./types";

export const COMMAND_RECENT_STORAGE_KEY = "novaops_command_recent_items";

export const COMMAND_RECENT_LIMIT = 20;

export const DEFAULT_NAVIGATION_COMMANDS: CommandItem[] = [
  {
    id: "nav-dashboard",
    title: "Dashboard",
    subtitle: "Go to enterprise command dashboard",
    group: "navigation",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "/dashboard",
    keywords: ["home", "overview", "main"],
  },
  {
    id: "nav-reports",
    title: "Reports",
    subtitle: "Open reports workspace",
    group: "navigation",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/dashboard/reports",
    keywords: ["analytics", "export", "reporting"],
  },
  {
    id: "nav-tasks",
    title: "Tasks",
    subtitle: "Open task management",
    group: "navigation",
    icon: <ClipboardCheck className="h-4 w-4" />,
    href: "/dashboard/tasks",
    keywords: ["checklist", "assignment", "work"],
  },
  {
    id: "nav-drafts",
    title: "Draft Center",
    subtitle: "Open saved task drafts",
    group: "navigation",
    icon: <FileText className="h-4 w-4" />,
    href: "/dashboard/drafts",
    keywords: ["draft", "saved", "pending"],
  },
  {
    id: "nav-settings",
    title: "Settings",
    subtitle: "Manage users, outlets, and configuration",
    group: "navigation",
    icon: <Settings className="h-4 w-4" />,
    href: "/dashboard/settings",
    keywords: ["users", "roles", "outlets", "config"],
  },
];

export const DEFAULT_QUICK_ACTION_COMMANDS: CommandItem[] = [
  {
    id: "quick-create-task",
    title: "Create Task",
    subtitle: "Start a new operational task",
    group: "quick-actions",
    icon: <Plus className="h-4 w-4" />,
    href: "/dashboard/tasks",
    keywords: ["new task", "assignment"],
    shortcut: "T",
  },
  {
    id: "quick-create-draft",
    title: "Create Draft",
    subtitle: "Open draft center",
    group: "quick-actions",
    icon: <FileText className="h-4 w-4" />,
    href: "/dashboard/drafts",
    keywords: ["draft", "save"],
    shortcut: "D",
  },
  {
    id: "quick-open-reports",
    title: "Open Reports",
    subtitle: "Analyze outlet performance",
    group: "quick-actions",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/dashboard/reports",
    keywords: ["analytics", "report"],
    shortcut: "R",
  },
  {
    id: "quick-go-home",
    title: "Go to Dashboard",
    subtitle: "Return to command center overview",
    group: "quick-actions",
    icon: <Home className="h-4 w-4" />,
    href: "/dashboard",
    keywords: ["home", "main"],
    shortcut: "H",
  },
];