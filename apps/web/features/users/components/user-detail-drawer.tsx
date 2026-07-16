import { User } from "../types";
import { getUserRoleClass, getUserStatusClass } from "../utils";

type UserDetailDrawerProps = {
  user: User | null;
  onClose: () => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserDetailDrawer({ user, onClose }: UserDetailDrawerProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button
        type="button"
        aria-label="Close drawer overlay"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-emerald-700">User Profile</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{user.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 shadow-sm">
              {getInitials(user.name)}
            </div>

            <div>
              <p className="font-semibold text-slate-950">{user.name}</p>
              <p className="text-sm text-slate-500">{user.id}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{user.username}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getUserRoleClass(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Outlet Access
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">{user.outlet}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getUserStatusClass(
                  user.status
                )}`}
              >
                {user.status}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last Active
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">{user.lastActive}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
