import { RefObject } from "react";

import { CommandItem as CommandItemType } from "../types";
import { getGroupLabel } from "../utils";
import { CommandItem } from "./command-item";

type CommandGroupProps = {
  group: string;
  commands: CommandItemType[];
  activeCommandId?: string;
  activeItemRef?: RefObject<HTMLDivElement | null>;
  onSelect: (command: CommandItemType) => void;
};

export function CommandGroup({
  group,
  commands,
  activeCommandId,
  activeItemRef,
  onSelect,
}: CommandGroupProps) {
  if (commands.length === 0) return null;

  return (
    <div className="px-2 py-2">
      <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {getGroupLabel(group)}
      </div>

      <div className="space-y-1">
        {commands.map((command) => {
          const isActive = command.id === activeCommandId;

          return (
            <div
              key={command.id}
              ref={isActive ? activeItemRef : undefined}
            >
              <CommandItem
                command={command}
                isActive={isActive}
                onSelect={() => onSelect(command)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}