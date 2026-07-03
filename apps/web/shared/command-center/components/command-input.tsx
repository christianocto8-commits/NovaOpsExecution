import { Command, Search } from "lucide-react";
import { RefObject } from "react";

type CommandInputProps = {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function CommandInput({
  value,
  onChange,
  inputRef,
}: CommandInputProps) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
        <Search className="h-4 w-4" />
      </div>

      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search commands, reports, tasks, outlets..."
        className="h-10 flex-1 bg-transparent text-[15px] font-medium text-slate-950 outline-none placeholder:font-normal placeholder:text-slate-400"
      />

      <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 sm:flex">
        <Command className="h-3 w-3" />
        K
      </div>
    </div>
  );
}