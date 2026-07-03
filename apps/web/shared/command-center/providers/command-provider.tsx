"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  DEFAULT_NAVIGATION_COMMANDS,
  DEFAULT_QUICK_ACTION_COMMANDS,
} from "../constants";
import { CommandCenter } from "../components/command-center";
import { useRecentItems } from "../hooks/use-recent-items";
import {
  CommandCenterContextValue,
  CommandItem,
} from "../types";

export const CommandCenterContext =
  createContext<CommandCenterContextValue | null>(null);

type CommandCenterProviderProps = {
  children: ReactNode;
};

export function CommandCenterProvider({
  children,
}: CommandCenterProviderProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [registeredCommands, setRegisteredCommands] = useState<CommandItem[]>(
    []
  );

  const { recentItems, registerRecentItem, clearRecentItems } =
    useRecentItems();

  const openCommandCenter = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCommandCenter = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const toggleCommandCenter = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const registerCommand = useCallback((command: CommandItem) => {
    setRegisteredCommands((current) => {
      const withoutDuplicate = current.filter(
        (item) => item.id !== command.id
      );

      return [...withoutDuplicate, command];
    });
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    setRegisteredCommands((current) =>
      current.filter((command) => command.id !== id)
    );
  }, []);

  const commands = useMemo<CommandItem[]>(() => {
    const recentCommands: CommandItem[] = recentItems.map((item) => ({
      id: `recent-${item.id}`,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      group: "recent",
      keywords: [item.title, item.subtitle ?? ""],
    }));

    return [
      ...DEFAULT_QUICK_ACTION_COMMANDS,
      ...DEFAULT_NAVIGATION_COMMANDS,
      ...registeredCommands,
      ...recentCommands,
    ].map((command) => ({
      ...command,
      action:
        command.action ??
        (command.href
          ? () => {
              registerRecentItem({
                id: command.id,
                title: command.title,
                subtitle: command.subtitle,
                href: command.href,
                group: command.group,
              });

              router.push(command.href as string);
            }
          : undefined),
    }));
  }, [recentItems, registeredCommands, registerRecentItem, router]);

  const value = useMemo<CommandCenterContextValue>(
    () => ({
      isOpen,
      query,
      commands,
      recentItems,
      openCommandCenter,
      closeCommandCenter,
      toggleCommandCenter,
      setQuery,
      registerCommand,
      unregisterCommand,
      registerRecentItem,
      clearRecentItems,
    }),
    [
      isOpen,
      query,
      commands,
      recentItems,
      openCommandCenter,
      closeCommandCenter,
      toggleCommandCenter,
      registerCommand,
      unregisterCommand,
      registerRecentItem,
      clearRecentItems,
    ]
  );

  return (
    <CommandCenterContext.Provider value={value}>
      {children}
      <CommandCenter />
    </CommandCenterContext.Provider>
  );
}