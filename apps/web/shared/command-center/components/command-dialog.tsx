"use client";

import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CornerDownLeft, Keyboard, X } from "lucide-react";

import { useCommandCenter } from "../hooks/use-command-center";
import { CommandItem } from "../types";
import { filterCommands } from "../utils";
import { CommandEmpty } from "./command-empty";
import { CommandGroup } from "./command-group";
import { CommandInput } from "./command-input";
import { ShortcutBadge } from "./shortcut-badge";

const GROUP_ORDER = ["quick-actions", "navigation", "recent", "search", "system"];

export function CommandDialog() {
  const {
    isOpen,
    query,
    commands,
    closeCommandCenter,
    setQuery,
  } = useCommandCenter();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredCommands = useMemo(
    () => filterCommands(commands, query),
    [commands, query]
  );

  const groupedCommands = useMemo(() => {
    return filteredCommands.reduce<Record<string, CommandItem[]>>(
      (groups, command) => {
        if (!groups[command.group]) groups[command.group] = [];
        groups[command.group].push(command);
        return groups;
      },
      {}
    );
  }, [filteredCommands]);

  const orderedGroups = useMemo(() => {
    const availableGroups = Object.keys(groupedCommands);

    return [
      ...GROUP_ORDER.filter((group) => availableGroups.includes(group)),
      ...availableGroups.filter((group) => !GROUP_ORDER.includes(group)),
    ];
  }, [groupedCommands]);

  const activeCommand = filteredCommands[activeIndex];

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  function executeCommand(command?: CommandItem) {
    if (!command?.action) return;

    command.action();
    closeCommandCenter();
  }

  function moveActiveIndex(direction: "up" | "down") {
    setActiveIndex((current) => {
      if (filteredCommands.length === 0) return 0;

      if (direction === "down") {
        return current >= filteredCommands.length - 1 ? 0 : current + 1;
      }

      return current <= 0 ? filteredCommands.length - 1 : current - 1;
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex("down");
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex("up");
    }

    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand(activeCommand);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandCenter();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 pt-[11vh] backdrop-blur-md"
      onMouseDown={closeCommandCenter}
    >
      <div
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl shadow-slate-950/25"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-white to-emerald-50/50 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              NovaOps Command Center
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Universal search, navigation, and quick actions
            </p>
          </div>

          <button
            type="button"
            onClick={closeCommandCenter}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <CommandInput
          inputRef={inputRef}
          value={query}
          onChange={setQuery}
        />

        <div className="max-h-[430px] overflow-y-auto bg-white p-2">
          {filteredCommands.length === 0 ? (
            <CommandEmpty />
          ) : (
            orderedGroups.map((group) => (
              <CommandGroup
                key={group}
                group={group}
                commands={groupedCommands[group]}
                activeCommandId={activeCommand?.id}
                activeItemRef={activeItemRef}
                onSelect={executeCommand}
              />
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5 text-slate-400" />
            <ShortcutBadge>↑↓</ShortcutBadge>
            <span>Navigate</span>
            <ShortcutBadge>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
              </span>
            </ShortcutBadge>
            <span>Select</span>
          </div>

          <div className="flex items-center gap-2">
            <ShortcutBadge>Esc</ShortcutBadge>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}