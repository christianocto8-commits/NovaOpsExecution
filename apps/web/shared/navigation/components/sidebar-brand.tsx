import { ChevronLeft, ChevronRight } from "lucide-react";

type SidebarBrandProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function SidebarBrand({ collapsed, onToggle }: SidebarBrandProps) {
  return (
    <div className="border-b border-[#DDE8E1] px-4 py-5">
      <div
        className={[
          "rounded-3xl bg-[#274733] text-white shadow-sm transition-all duration-300",
          collapsed ? "p-3" : "p-5",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className={collapsed ? "sr-only" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#EAF1EC]">
              NovaOps
            </p>
            <h1 className="mt-2 text-xl font-bold">Enterprise</h1>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {!collapsed ? (
          <p className="mt-2 text-xs leading-5 text-[#DDE8E1]">
            Multi-outlet operations command center.
          </p>
        ) : null}
      </div>
    </div>
  );
}
