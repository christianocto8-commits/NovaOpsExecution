import { CommandItem } from "./types";

export function normalizeCommandText(value: string) {
  return value.trim().toLowerCase();
}

export function scoreCommand(command: CommandItem, query: string) {
  const normalizedQuery = normalizeCommandText(query);

  if (!normalizedQuery) return 1;

  const searchable = [
    command.title,
    command.subtitle,
    command.group,
    ...(command.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (command.title.toLowerCase() === normalizedQuery) return 100;
  if (command.title.toLowerCase().startsWith(normalizedQuery)) return 75;
  if (searchable.includes(normalizedQuery)) return 50;

  return 0;
}

export function filterCommands(commands: CommandItem[], query: string) {
  return commands
    .map((command) => ({
      command,
      score: scoreCommand(command, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.command);
}

export function getGroupLabel(group: string) {
  const labels: Record<string, string> = {
    navigation: "Navigation",
    "quick-actions": "Quick Actions",
    recent: "Recent Items",
    search: "Search Results",
    system: "System",
  };

  return labels[group] ?? group;
}