"use client";

import Link from "next/link";
import {
  Bell,
  FileClock,
  GraduationCap,
  LogOut,
  Megaphone,
  Sandwich,
  Settings,
  ShieldCheck,
  Siren,
  Wrench,
} from "lucide-react";
import { useSyncExternalStore } from "react";

import { useSettings } from "@/features/settings/hooks/use-settings";
import { isCapaEnabled } from "@/features/settings/utils/capa-settings";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/shared/i18n";
import { mobileDashboardMainClass } from "@/shared/layout/mobile-page";
import {
  getServerWorkspaceSnapshot,
  getWorkspaceSnapshot,
  subscribeWorkspace,
} from "@/shared/navigation";

type MoreLink = {
  href: string;
  titleKey: string;
  bodyKey: string;
  icon: typeof Settings;
  tone: string;
};

export default function OutletMorePage() {
  const { t } = useLanguage();
  const { logout, user, can } = useAuth();
  const { settings } = useSettings();
  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  );
  const capaEnabled = isCapaEnabled(settings);
  const canReportIssue = can("incident.create") || can("incident.read");

  const links: MoreLink[] = [
    {
      href: "/dashboard/drafts",
      titleKey: "more.link.drafts",
      bodyKey: "more.link.draftsBody",
      icon: FileClock,
      tone: "bg-blue-50 text-blue-700",
    },
    ...(canReportIssue
      ? [
          {
            href: "/dashboard/incidents?create=1",
            titleKey: "more.link.reportIssue",
            bodyKey: "more.link.reportIssueBody",
            icon: Siren,
            tone: "bg-red-50 text-red-700",
          } satisfies MoreLink,
        ]
      : []),
    ...(capaEnabled
      ? [
          {
            href: "/dashboard/corrective-actions",
            titleKey: "more.link.capa",
            bodyKey: "more.link.capaBody",
            icon: Wrench,
            tone: "bg-amber-50 text-amber-800",
          } satisfies MoreLink,
        ]
      : []),
    {
      href: "/dashboard/training",
      titleKey: "more.link.training",
      bodyKey: "more.link.trainingBody",
      icon: GraduationCap,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      href: "/dashboard/food-prep",
      titleKey: "more.link.foodPrep",
      bodyKey: "more.link.foodPrepBody",
      icon: Sandwich,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      href: "/dashboard/haccp",
      titleKey: "more.link.haccp",
      bodyKey: "more.link.haccpBody",
      icon: ShieldCheck,
      tone: "bg-teal-50 text-teal-700",
    },
    {
      href: "/dashboard/notifications",
      titleKey: "more.link.notifications",
      bodyKey: "more.link.notificationsBody",
      icon: Bell,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      href: "/dashboard/announcements",
      titleKey: "more.link.announcements",
      bodyKey: "more.link.announcementsBody",
      icon: Megaphone,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      href: "/dashboard/settings",
      titleKey: "more.link.settings",
      bodyKey: "more.link.settingsBody",
      icon: Settings,
      tone: "bg-slate-100 text-slate-700",
    },
  ];

  return (
    <main className={mobileDashboardMainClass}>
      <div>
        <p className="text-sm font-medium text-emerald-700">{t("more.eyebrow")}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{t("more.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {workspace.outletName
            ? t("more.subtitleOutlet", { outlet: workspace.outletName })
            : t("more.subtitle")}
        </p>
        {user?.user.full_name || user?.user.email ? (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {user.user.full_name || user.user.email}
          </p>
        ) : null}
      </div>

      <ul className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white">
        {links.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.href} className={index > 0 ? "border-t border-slate-100" : ""}>
              <Link
                href={item.href}
                className="flex min-h-[72px] items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100"
              >
                <span
                  className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-950">{t(item.titleKey)}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">{t(item.bodyKey)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => void logout()}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
      >
        <LogOut className="size-4" />
        {t("more.logout")}
      </button>
    </main>
  );
}
