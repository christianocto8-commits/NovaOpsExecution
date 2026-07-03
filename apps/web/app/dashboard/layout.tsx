"use client";

import { AuthGuard } from "@/lib/auth/auth-guard";
import { OutletProvider } from "@/features/outlets/hooks/use-outlet-context";
import { CommandCenterProvider } from "@/shared/command-center";
import { EnterpriseLayout } from "@/shared/layout/enterprise-layout";
import { AppProviders } from "@/shared/providers/app-providers";
import { QueryProvider } from "@/shared/providers/query-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <QueryProvider>
        <AppProviders>
          <OutletProvider>
            <CommandCenterProvider>
              <EnterpriseLayout>{children}</EnterpriseLayout>
            </CommandCenterProvider>
          </OutletProvider>
        </AppProviders>
      </QueryProvider>
    </AuthGuard>
  );
}
