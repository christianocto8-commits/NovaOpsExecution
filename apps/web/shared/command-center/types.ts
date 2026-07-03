import { ReactNode } from "react";

export type CommandGroup =
  | "navigation"
  | "quick-actions"
  | "recent"
  | "search"
  | "system";

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  group: CommandGroup;
  icon?: ReactNode;
  keywords?: string[];
  shortcut?: string;
  href?: string;
  action?: () => void;
};

export type RecentCommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  group?: CommandGroup;
  createdAt: string;
};

export type CommandCenterContextValue = {
  isOpen: boolean;
  query: string;
  commands: CommandItem[];
  recentItems: RecentCommandItem[];
  openCommandCenter: () => void;
  closeCommandCenter: () => void;
  toggleCommandCenter: () => void;
  setQuery: (query: string) => void;
  registerCommand: (command: CommandItem) => void;
  unregisterCommand: (id: string) => void;
  registerRecentItem: (item: Omit<RecentCommandItem, "createdAt">) => void;
  clearRecentItems: () => void;
};