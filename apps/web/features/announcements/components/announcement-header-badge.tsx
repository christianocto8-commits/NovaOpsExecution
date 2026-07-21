"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Megaphone } from "lucide-react";

import { queryKeys } from "@/lib/query/keys";
import { announcementService } from "@/services/announcement.service";

export function AnnouncementHeaderBadge() {
  const query = useQuery({
    queryKey: queryKeys.announcements.unreadCount(),
    queryFn: announcementService.getUnreadCount,
    retry: false,
    refetchInterval: 30_000,
  });

  const count = query.data?.unread_count ?? 0;
  if (count <= 0) return null;

  return (
    <Link
      href="/dashboard/operator"
      title="Pengumuman belum dibaca"
      className="relative flex size-10 items-center justify-center rounded-full border border-[#DDE8E1] bg-[#F7FAF8] text-[#3D6B49] transition hover:border-[#BFD3C6] hover:bg-[#EAF1EC]"
    >
      <Megaphone className="size-4" />
      <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
