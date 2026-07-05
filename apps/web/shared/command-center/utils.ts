import { CommandItem } from "./types";

export function filterCommandItems(items: CommandItem[], query: string) {
  const value = query.trim().toLowerCase();

  if (!value) return items;

  return items.filter((item) => {
    return (
      item.title.toLowerCase().includes(value) ||
      item.description?.toLowerCase().includes(value) ||
      item.group.toLowerCase().includes(value) ||
      item.type.toLowerCase().includes(value)
    );
  });
}

export function groupCommandItems(items: CommandItem[]) {
  return items.reduce<Record<string, CommandItem[]>>((groups, item) => {
    if (!groups[item.group]) {
      groups[item.group] = [];
    }

    groups[item.group].push(item);
    return groups;
  }, {});
}

export function getGroupLabel(group: string) {
  return group
    .split(/[-_]/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
