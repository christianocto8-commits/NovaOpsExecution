import { LucideIcon } from "lucide-react";
import { NovaRole } from "@/shared/navigation";

export type CommandItemType =
  "navigation" | "action" | "task" | "report" | "outlet" | "user" | "setting";

export type CommandItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  group: string;
  type: CommandItemType;
  icon?: LucideIcon;
  shortcut?: string;
  allowedRoles?: NovaRole[];
  action?: () => void;
};
