"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";

import { AnnouncementSlidePanel } from "@/features/announcements/components/announcement-slide-panel";
import { queryKeys } from "@/lib/query/keys";
import { announcementService } from "@/services/announcement.service";
import { useLanguage } from "@/shared/i18n";

export function AnnouncementHeaderButton() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.announcements.unreadCount(),
    queryFn: announcementService.getUnreadCount,
    retry: false,
    refetchInterval: mounted ? 30_000 : 60_000,
  });

  const badgeCount = unreadCountQuery.data?.unread_count ?? 0;

  useEffect(() => {
    if (!mounted) return;

    const frame = window.requestAnimationFrame(() => setVisible(true));

    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  function openPanel() {
    setMounted(true);
    setVisible(true);
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
        title={t("navigation.announcements")}
        onClick={openPanel}
        className="relative flex size-10 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
      >
        <Megaphone className="size-4" />
        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
        <span className="sr-only">{t("navigation.announcements")}</span>
      </button>

      {mounted ? <AnnouncementSlidePanel open={visible} onClose={closePanel} /> : null}
    </>
  );
}
