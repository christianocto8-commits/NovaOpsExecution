import { ReactNode } from "react";

type ToolbarProps = {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
};

export function Toolbar({ left, right, children }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      {children ? (
        children
      ) : (
        <>
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            {left}
          </div>

          {right ? (
            <div className="flex shrink-0 items-center gap-2">{right}</div>
          ) : null}
        </>
      )}
    </div>
  );
}