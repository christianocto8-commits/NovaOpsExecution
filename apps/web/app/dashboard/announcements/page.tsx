"use client";

import { useContext } from "react";

import { AnnouncementInboxPanel } from "@/features/announcements/components/announcement-inbox-panel";
import { AnnouncementsPanel } from "@/features/announcements/components/announcements-panel";
import { AuthContext } from "@/providers/AuthProvider";
import { useLanguage } from "@/shared/i18n";

export default function AnnouncementsPage() {
  const auth = useContext(AuthContext);
  const { t } = useLanguage();
  const canManage = auth?.can("notification.manage") ?? false;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#274733]">{t("navigation.announcements")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {canManage
            ? "Kelola broadcast pengumuman untuk crew outlet."
            : "Lihat pengumuman dan update operasional untuk outlet Anda."}
        </p>
      </div>
      {canManage ? <AnnouncementsPanel /> : <AnnouncementInboxPanel />}
    </div>
  );
}
