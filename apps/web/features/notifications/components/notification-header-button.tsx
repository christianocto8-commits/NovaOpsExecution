"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import {
  NotificationSlidePanel,
  getNotificationBadgeCount,
} from "@/features/notifications/components/notification-slide-panel";
import { notificationKeys } from "@/features/notifications/hooks/use-notifications-workspace";
import { useLanguage } from "@/shared/i18n";
import { notificationService } from "@/services/notification.service";

export function NotificationHeaderButton() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const inboxQuery = useQuery({
    queryKey: notificationKeys.inbox(),
    queryFn: notificationService.listMine,
    retry: false,
    refetchInterval: mounted ? 30_000 : 60_000,
  });

  const badgeCount = getNotificationBadgeCount(inboxQuery.data ?? []);

  useEffect(() => {
    if (!mounted) return;

    const frame = window.requestAnimationFrame(() => setVisible(true));

    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  function openPanel() {
    setMounted(true);
  }

  function closePanel() {
    setVisible(false);
    window.setTimeout(() => {
      setMounted(false);
    }, 300);
  }

  return (
    <>
      <button
        type="button"
        title={t("navigation.notifications")}
        onClick={openPanel}
        className="relative flex size-10 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
      >
        <Bell className="size-4" />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
        <span className="sr-only">{t("navigation.notifications")}</span>
      </button>

      {mounted ? <NotificationSlidePanel open={visible} onClose={closePanel} /> : null}
    </>
  );
}
