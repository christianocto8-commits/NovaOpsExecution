"use client";

import { Bell, BellOff, X } from "lucide-react";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/shared/toast";

type PushNotificationPromptProps = {
  compact?: boolean;
};

function isSecureContextForPush() {
  if (typeof window === "undefined") return true;
  return window.isSecureContext || window.location.protocol === "https:";
}

export function PushNotificationPrompt({ compact = false }: PushNotificationPromptProps) {
  const toast = useToast();
  const push = usePushNotifications();
  const secureContext = isSecureContextForPush();

  if (!push.isSupported || !push.isConfigured) {
    return null;
  }

  if (!secureContext) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Push notification membutuhkan HTTPS</p>
        <p className="mt-1 text-amber-800/90">
          Aktifkan domain + SSL (DNS A record ke VPS, lalu certbot) sebelum crew outlet bisa
          menerima notifikasi task. Lihat panduan di{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">deploy/README_VPS.md</code>{" "}
          atau{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
            scripts/vps-setup-ssl.sh
          </code>
          .
        </p>
      </div>
    );
  }

  async function handleSubscribe() {
    const success = await push.subscribe();

    if (success) {
      toast.success("Notifikasi push aktif. Anda akan menerima pembaruan task.");
    } else if (push.error) {
      toast.error(push.error);
    }
  }

  async function handleUnsubscribe() {
    const success = await push.unsubscribe();

    if (success) {
      toast.success("Notifikasi push dinonaktifkan.");
    } else if (push.error) {
      toast.error(push.error);
    }
  }

  if (push.isSubscribed && !compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Bell className="size-4 shrink-0" />
        <span>Notifikasi push aktif untuk task outlet.</span>
        <button
          type="button"
          onClick={() => void handleUnsubscribe()}
          disabled={push.isLoading}
          className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
        >
          <BellOff className="size-3.5" />
          Nonaktifkan
        </button>
      </div>
    );
  }

  if (!push.canPrompt && !compact) {
    return null;
  }

  if (compact && !push.canPrompt && !push.isSubscribed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <button
        type="button"
        onClick={push.dismissPrompt}
        className="absolute right-3 top-3 rounded-full p-1 text-sky-500 hover:bg-sky-100"
        aria-label="Tutup"
      >
        <X className="size-4" />
      </button>

      <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Aktifkan notifikasi task</p>
            <p className="mt-1 text-sky-800/90">
              Dapatkan pemberitahuan saat task ditugaskan, mendekati deadline, atau terlambat.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={push.isLoading}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-60"
        >
          {push.isLoading ? "Memproses..." : "Aktifkan"}
        </button>
      </div>
    </div>
  );
}
