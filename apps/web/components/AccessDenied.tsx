"use client";

import { useLanguage } from "@/shared/i18n";

type AccessDeniedProps = {
  email?: string;
  roleLabel?: string;
  onLogout: () => void;
};

/**
 * Shown inside the native Android app when a non-outlet account tries to sign
 * in. The app is restricted to the "outlet" role only.
 */
export function AccessDenied({ email, roleLabel, onLogout }: AccessDeniedProps) {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#274733] px-6 text-center text-white">
      <div className="w-full max-w-sm rounded-3xl border border-emerald-700/40 bg-white/5 p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20 text-3xl">
          {"\u{1F512}"}
        </div>
        <h1 className="text-xl font-bold">Akses Ditolak</h1>
        <p className="mt-3 text-sm leading-6 text-emerald-100">
          Aplikasi NovaOps Mobile hanya untuk role <strong>Outlet</strong>. Akun Anda (
          {email ?? "—"}
          {roleLabel ? `, ${roleLabel}` : ""}) tidak memiliki akses ke aplikasi ini.
        </p>
        <p className="mt-3 text-xs text-emerald-200/70">
          Gunakan akun outlet, atau buka web di https://nova-ops.cloud untuk akses penuh.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-6 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#274733] transition hover:bg-emerald-50"
        >
          Keluar
        </button>
      </div>
    </main>
  );
}
