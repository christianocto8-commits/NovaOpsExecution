import { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={["rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", className].join(
        " "
      )}
    >
      {children}
    </div>
  );
}
