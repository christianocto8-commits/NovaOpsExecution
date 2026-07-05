import { CurrentWorkspace } from "../role-config";

type SidebarFooterProps = {
  collapsed: boolean;
  workspace: CurrentWorkspace;
};

export function SidebarFooter({ collapsed, workspace }: SidebarFooterProps) {
  const title = workspace.mode === "outlet" ? (workspace.outletName ?? "Outlet") : "KOV Operations";

  return (
    <div className="border-t border-[#DDE8E1] p-4">
      <div
        className={[
          "rounded-2xl border border-[#DDE8E1] bg-[#F7FAF8] transition-all",
          collapsed ? "p-3 text-center" : "p-4",
        ].join(" ")}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3D6B49]">
          {collapsed ? "KOV" : workspace.roleLabel}
        </p>

        {!collapsed ? (
          <>
            <p className="mt-1 text-sm font-bold text-[#274733]">{title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {workspace.mode === "outlet" ? "Outlet mode active" : "Enterprise mode active"}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
